import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function proxy(request: NextRequest, params: { path: string[] }) {
  const path = params.path?.join("/") || "";
  const url = `${BACKEND_URL}/${path}`;
  const headers = new Headers(request.headers);
  headers.set("accept", "application/json");
  headers.set("content-type", "application/json");

  const incomingToken =
    request.headers.get("authorization") || request.cookies.get("token")?.value;
  if (incomingToken) {
    headers.set(
      "authorization",
      incomingToken.startsWith("Bearer ")
        ? incomingToken
        : `Bearer ${incomingToken}`,
    );
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const backendResponse = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const responseBody = await backendResponse.text();
  const noContent = [204, 205, 304].includes(backendResponse.status);
  const response = noContent
    ? new NextResponse(null, { status: backendResponse.status })
    : new NextResponse(responseBody, {
        status: backendResponse.status,
      });

  backendResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxy(request, context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxy(request, context.params);
}

export async function PUT(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxy(request, context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxy(request, context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return proxy(request, context.params);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
