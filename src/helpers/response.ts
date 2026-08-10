type ErrorItem = {
  key: string;
  message: string;
};

export interface ResponseData<T> {
  data: T | null;
  status: "success" | "error";
  message: string;
  errors: ErrorItem[];
}

export const responseData = <T>(
  data: T | null,
  status: "success" | "error",
  errors: ErrorItem[],
  messageText?: string | Error,
): ResponseData<T | null> => {
  return {
    data,
    status,
    errors,
    message:
      messageText instanceof Error &&
      typeof messageText.message === "string" &&
      messageText.message.length > 0
        ? messageText.message
        : typeof messageText === "string" && messageText.length > 0
          ? messageText
          : "Ошибка на стороне сервера",
  };
};
