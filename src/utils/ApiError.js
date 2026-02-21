class ApiError extends Error{
    constructor(
        statuscode,
        message="something went wrong",
        errors=[],
        stack=""
    ){
        super(message)
        this.data=null
        this.message=message
        this.statuscode=statuscode
        this.success=false;
        this.errors=errors


        if (stack) {
            this.stack=stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}