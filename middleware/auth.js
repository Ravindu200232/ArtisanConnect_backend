import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    // Remove Bearer from string
    token = token.replace("Bearer ", "");

    // Verify token
    const decoded = jwt.verify(token, process.env.SEKRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};
