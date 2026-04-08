const responseHandler = (req, res, next) => {
    res.success = (status=200, message='ok', data=null) => {
        return res
            .status(status)
            .json({
                success: true,
                message,
                data
            })
    }

    res.error = (status=500, message='internal server error', error = null) => {
        return res
            .status(status)
            .json({
                success: false,
                message,
                error
            })
    }

    next();
}

export default responseHandler;