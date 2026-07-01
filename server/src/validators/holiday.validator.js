import Joi from "joi";

const objectId = Joi.string().hex().length(24);

export const createHolidaySchema = Joi.object({
  branchId: objectId.allow(null),

  holidayName: Joi.string().trim().min(2).max(120).required(),

  date: Joi.date().required(),

  type: Joi.string()
    .valid("public", "company", "optional", "festival")
    .default("company"),

  description: Joi.string().trim().allow("", null),

  isPaid: Joi.boolean().default(true),

  isActive: Joi.boolean().default(true),
});

export const updateHolidaySchema = createHolidaySchema.fork(
  ["holidayName", "date"],
  (schema) => schema.optional()
);