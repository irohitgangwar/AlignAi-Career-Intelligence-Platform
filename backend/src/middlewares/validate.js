export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");

      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: details,
      });
    }
    // Re-assign coerced or parsed data
    req.body = result.data;
    next();
  };
};
