import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Consistent JSON envelope for every API response
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccessResponse<T>, {
    status,
  });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function badRequest(error: string) {
  return NextResponse.json({ success: false, error } satisfies ApiErrorResponse, {
    status: 400,
  });
}

export function unauthorized(error = 'Authentication required') {
  return NextResponse.json({ success: false, error } satisfies ApiErrorResponse, {
    status: 401,
  });
}

export function forbidden(error = 'Insufficient permissions') {
  return NextResponse.json({ success: false, error } satisfies ApiErrorResponse, {
    status: 403,
  });
}

export function notFound(error = 'Resource not found') {
  return NextResponse.json({ success: false, error } satisfies ApiErrorResponse, {
    status: 404,
  });
}

export function serverError(error = 'Internal server error') {
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', error);
  }
  return NextResponse.json(
    { success: false, error: 'Internal server error' } satisfies ApiErrorResponse,
    { status: 500 },
  );
}
