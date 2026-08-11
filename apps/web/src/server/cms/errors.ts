export class CmsUnavailableError extends Error {
  constructor(message = "CMS is unavailable") {
    super(message);
    this.name = "CmsUnavailableError";
  }
}

export class CmsValidationError extends Error {
  constructor(message = "CMS returned invalid data") {
    super(message);
    this.name = "CmsValidationError";
  }
}
