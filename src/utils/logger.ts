import * as core from "@actions/core";

export type LogLevel = "debug" | "info" | "warn" | "error";

let isAction = false;

export function setActionMode(enabled: boolean): void {
  isAction = enabled;
}

export function debug(message: string): void {
  if (isAction) {
    core.debug(message);
  } else {
    console.debug(`[debug] ${message}`);
  }
}

export function info(message: string): void {
  if (isAction) {
    core.info(message);
  } else {
    console.log(message);
  }
}

export function warn(message: string): void {
  if (isAction) {
    core.warning(message);
  } else {
    console.warn(`[warn] ${message}`);
  }
}

export function error(message: string): void {
  if (isAction) {
    core.error(message);
  } else {
    console.error(`[error] ${message}`);
  }
}
