import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { responseData } from "src/helpers/response";

export const validationPipe = new ValidationPipe({
  transform: true,
  exceptionFactory: (validateErrors: ValidationError[]) => {
    const errors: { key: string; message: string }[] = [];

    for (const error of validateErrors) {
      let message = "";
      for (const key in error.constraints) {
        const errorText = error.constraints[key];
        if (typeof errorText === "string" && errorText.length > 0) {
          message = errorText;
          break;
        }
      }

      errors.push({ key: error.property, message });
    }

    throw new BadRequestException(responseData(null, "error", errors));
  },
});
