module.exports = (res, statusCode, data = null, message = null) => {
  const response = {
    success: statusCode < 400,
  };

  if (message) response.message = message;
  if (data !== null && data !== undefined) response.data = data;

  res.status(statusCode).json(response);
};
