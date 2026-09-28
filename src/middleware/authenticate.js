/**
 * TeamForge AI - JWT Authentication Middleware
 *
 * Verifies Bearer access tokens before allowing requests to
 * reach protected application resources.
 */

const jwt = require("jsonwebtoken");

const userRepository = require("../repositories/user.repository");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;
  /*
   * Protected endpoints require the standard:
   *
   * Authorization: Bearer <token>
   */

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new AppError(
      "Authentication is required to access this resource.",
      401,
    );
  }

  const token = authorization.substring(7);

  let payload;

  try {
    /*
     * Validate token signature, expiry, issuer
     * and intended audience.
     */
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "teamforge-ai",
      audience: "teamforge-ai-web",
    });
  } catch {
    /*
     * JWT library details are deliberately not exposed.
     *
     * Expired, malformed and invalid-signature tokens
     * receive the same controlled response.
     */
    throw new AppError(
      "The supplied authentication token is invalid or expired.",
      401,
    );
  }
  /*
   * A token may still be cryptographically valid even if
   * the corresponding account has subsequently disappeared.
   */
  const user = await userRepository.findById(payload.sub);

  if (!user) {
    throw new AppError(
      "The account associated with this token no longer exists.",
      401,
    );
  }

  /*
   * Attach the authenticated identity to the request so downstream
   * controllers and authorization checks can use it.
   */
  req.user = user;

  next();
});

module.exports = authenticate;
