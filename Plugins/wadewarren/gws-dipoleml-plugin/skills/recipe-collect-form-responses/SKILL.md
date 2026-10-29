---
name: recipe-collect-form-responses
version: 1.0.0
description: "Retrieve and review responses from a Google Form."
metadata:
  openclaw:
    category: "recipe"
    domain: "productivity"
    requires:
      bins: ["gws"]
      skills: ["gws-forms"]
---

# Check Form Responses

> **PREREQUISITE:** Load the following skills to execute this recipe: `gws-forms`

Retrieve and review responses from a Google Form.

## Steps

1. Get the form ID from the Google Forms URL (the Google Forms API does not support listing forms — find the ID in the form's URL: `https://docs.google.com/forms/d/FORM_ID/edit`)
2. Get form details: `gws forms forms get --params '{"formId": "FORM_ID"}'`
3. Get responses: `gws forms forms responses list --params '{"formId": "FORM_ID"}' --format table`

