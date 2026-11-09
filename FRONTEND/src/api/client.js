import axios from "axios";

const API_BASE = "/api";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

function normalizeError(error) {
  if (error.response) {
    const data = error.response.data || {};
    return {
      status: error.response.status,
      code: data.code || "UNKNOWN_ERROR",
      message: data.message || "An unexpected error occurred",
      details: data.details || null,
    };
  }
  if (error.code === "ECONNABORTED") {
    return {
      status: 0,
      code: "REQUEST_TIMEOUT",
      message: "The request timed out",
    };
  }
  if (error.code && error.message) {
    return error;
  }
  return {
    status: 0,
    code: "NETWORK_ERROR",
    message: "Network error — unable to reach the server",
  };
}

client.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && data.success === false) {
      return Promise.reject({
        status: response.status,
        code: data.code || "UNKNOWN_ERROR",
        message: data.message || "Request failed",
        details: data.details || null,
      });
    }
    return response;
  },
  (error) => Promise.reject(normalizeError(error))
);

export function setSessionHeader(sessionId) {
  if (sessionId) {
    client.defaults.headers.common["x-workflow-session"] = sessionId;
  } else {
    delete client.defaults.headers.common["x-workflow-session"];
  }
}

export function unwrap(response) {
  return response.data && response.data.data !== undefined ? response.data.data : response.data;
}

export default client;
