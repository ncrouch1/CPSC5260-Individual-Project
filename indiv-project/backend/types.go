package main

type ResponseOutput struct {
	In  Input  `json:"AgentInput" jsonschema_description:"the input for the agent"`
	Out Output `json:"AgentOutput" jsonschema_decription:"the output of the agent`
}

type Input struct {
	Code    string `json:"code" jsonschema_description:"the code submitted in this response"`
	Persona string `json:"persona" jsonschema_description:"the persona in which the LLM/AI Agent is to assume"`
}

type Output struct {
	RefactoredCode           string   `json:"RefactoredCode" jsonschema_description:"Code refactored by the agent"`
	ReasonsingForRefactoring []string `json:"RefactorReasons" jsonschema_description:"reasons for why each section of the code block was refactored"`
}

type RequestBody struct {
	Code string `json:"code" jsonschema_description:"the code submitted in this Request"`
}
