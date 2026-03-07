import jwt from "jsonwebtoken";

/**
 * Auth middleware
 * @param {boolean} required - true if route requires authentication
 */
export default function authMiddleware(required = true) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    // No token provided
    if (!authHeader) {
      if (!required) return next(); // Public route, continue
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      if (!required) return next(); // Public route, continue
      return res.status(401).json({ message: "Token missing" });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Attach minimal user info to request
      req.user = {
        uid: decoded.uid,
        role: decoded.role,
        branchId: decoded.branchId,
      };

      next(); // Proceed
    } catch (err) {

      if (!required) return next(); // Public route, continue
      // Protected route with invalid/expired token
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}
