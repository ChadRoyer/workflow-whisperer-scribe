
// Validation functions
export function validateWorkflowData(data: any): boolean {
  return (
    data.title && 
    data.start_event && 
    data.end_event && 
    Array.isArray(data.people) && 
    Array.isArray(data.systems) && 
    data.pain_point !== undefined && 
    data.pain_point !== null
  );
}

export function formatWorkflowParameters() {
  return {
    name: "add_workflow",
    description: "Add a new workflow to the database",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short label for the workflow"
        },
        start_event: {
          type: "string",
          description: "The exact trigger that starts the workflow"
        },
        end_event: {
          type: "string",
          description: "What marks the workflow as finished"
        },
        people: {
          type: "array",
          items: { type: "string" },
          description: "Array of distinct roles or job titles mentioned"
        },
        systems: {
          type: "array",
          items: { type: "string" },
          description: "Array of software or artifacts involved"
        },
        pain_point: {
          type: "string",
          description: "Single sentence describing friction if revealed"
        }
      },
      required: ["title", "start_event", "end_event", "people", "systems", "pain_point"]
    }
  };
}
