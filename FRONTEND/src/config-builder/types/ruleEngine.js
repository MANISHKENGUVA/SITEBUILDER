export const RULE_OPERATORS = Object.freeze([
  { value: "AND", label: "AND (All conditions must match)" },
  { value: "OR", label: "OR (At least one condition must match)" },
]);

export const CONDITION_OPERATORS = Object.freeze([
  { value: "=", label: "Equals (=)" },
  { value: "!=", label: "Not Equals (!=)" },
  { value: ">", label: "Greater Than (>)" },
  { value: ">=", label: "Greater Than or Equal (>=)" },
  { value: "<", label: "Less Than (<)" },
  { value: "<=", label: "Less Than or Equal (<=)" },
  { value: "in", label: "In Array (in)" },
  { value: "contains", label: "Contains Substring" },
  { value: "exists", label: "Field Exists" },
]);

export const VALUE_TYPES = Object.freeze([
  { value: "string", label: "Text (String)" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean (true/false)" },
  { value: "json", label: "JSON / Array" },
]);
