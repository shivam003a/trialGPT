const responseHandler = (req, res, next) => {
    res.success = (status = 200, message = "ok", data = null) => {
        return res.status(status).json({
            success: true,
            statusCode: status,
            message,
            data,
        });
    };

    res.error = (
        status = 500,
        message = "internal server error",
        error = null,
    ) => {
        return res.status(status).json({
            success: false,
            statusCode: status,
            message,
            error,
        });
    };

    next();
};

export default responseHandler;
