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
  messageText?: string,
): ResponseData<T | null> => {
  return { data, status, errors, message: messageText ? messageText : "" };
};
