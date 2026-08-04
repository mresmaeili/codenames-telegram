import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(_request: Request, response: Response) {
  response.status(404).json({ message: "Not found" });
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  const message =
    error instanceof Error ? error.message : "Internal server error";

  response.status(500).json({ message });
}
