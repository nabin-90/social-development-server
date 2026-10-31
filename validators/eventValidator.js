const isValidString = (value) => {
  return typeof value === "string" && value.trim().length > 0;
};

const validateEvent = (eventData) => {
  const errors = {};

  // Validate title
  if (!isValidString(eventData.title)) {
    errors.title = "Event title is required";
  } else if (eventData.title.trim().length < 3) {
    errors.title = "Event title must be at least 3 characters";
  }

  // Validate description
  if (!isValidString(eventData.description)) {
    errors.description = "Event description is required";
  } else if (eventData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters";
  }

  // Validate location
  if (!isValidString(eventData.location)) {
    errors.location = "Event location is required";
  }


  // Validate event date
if (!isValidString(eventData.eventDate)) {
  errors.eventDate = "Event date is required";
} else {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(eventData.eventDate)) {
    errors.eventDate = "Date must be in YYYY-MM-DD format";
  } else {
    const [year, month, day] = eventData.eventDate
      .split("-")
      .map(Number);

    const eventDate = new Date(year, month - 1, day);

    const isRealDate =
      eventDate.getFullYear() === year &&
      eventDate.getMonth() === month - 1 &&
      eventDate.getDate() === day;

    if (!isRealDate) {
      errors.eventDate = "Invalid calendar date";
    } else {
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        errors.eventDate = "Event date cannot be in the past";
      }
    }
  }
}

  // Validate event type
  if (!isValidString(eventData.type)) {
    errors.type = "Event type is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default validateEvent;
