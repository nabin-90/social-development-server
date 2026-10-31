import validateEvent from "./validators/eventValidator.js";

const invalidEvent = {
  title: 12345,
  description: null,
  location: 500,
  eventDate: "invalid-date",
  type: false,
};

const result = validateEvent(invalidEvent);

console.log(result);