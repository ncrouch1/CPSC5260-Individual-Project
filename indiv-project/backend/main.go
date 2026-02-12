package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/invopop/jsonschema"
	"github.com/joho/godotenv"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/responses"
)

const SYSTEM = "system"
const USER = "user"

func GenerateSchema[T any]() map[string]any {
	reflector := jsonschema.Reflector{
		AllowAdditionalProperties: false,
		DoNotReference:            true,
	}
	var v T
	schema := reflector.Reflect(v)

	data, _ := json.Marshal(schema)
	var result map[string]any
	json.Unmarshal(data, &result)
	return result
}

func main() {
	godotenv.Load("project.env")
	API_KEY, found := os.LookupEnv("OPEN_AI_KEY")
	if !found || API_KEY == "" {
		log.Fatal("error in finding OPEN_AI_KEY in env")
		os.Exit(1)
	}
	client := openai.NewClient()
	ctx := context.TODO()
	r := gin.Default()
	fmt.Printf("%s, %s\n", client, ctx)
	personaFile, err := os.OpenFile("persona.txt", os.O_RDONLY, os.FileMode(os.O_RDONLY))
	if err != nil {
		log.Fatal("error in parsing Persona file for the ai agent")
		os.Exit(1)
	}
	persona, err := io.ReadAll(personaFile)
	if err != nil {
		log.Fatal("error in parsing Persona file for the ai agent")
		os.Exit(1)
	}

	ResponseOutputSchema := GenerateSchema[ResponseOutput]()

	r.GET("/refactor", func(c *gin.Context) {
		var reqBody RequestBody
		err := c.ShouldBindJSON(&reqBody)

		if err != nil {
			// Check specifically for an io.EOF error, which indicates an empty body
			if errors.Is(err, io.EOF) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Request body must not be empty"})
				return
			}
			// Handle other binding errors (e.g., validation errors, malformed JSON)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		input := &Input{
			Code:    reqBody.Code,
			Persona: string(persona),
		}

		response, err := client.Responses.New(ctx, responses.ResponseNewParams{
			Model: openai.ChatModelGPT5_2,
			Input: responses.ResponseNewParamsInputUnion{
				OfInputItemList: responses.ResponseInputParam{
					responses.ResponseInputItemParamOfInputMessage(
						responses.ResponseInputMessageContentListParam{responses.ResponseInputContentParamOfInputText(input.Persona)},
						SYSTEM,
					),
					responses.ResponseInputItemParamOfInputMessage(
						responses.ResponseInputMessageContentListParam{responses.ResponseInputContentParamOfInputText(input.Code)},
						USER,
					),
				},
			},
			Text: responses.ResponseTextConfigParam{
				Format: responses.ResponseFormatTextConfigParamOfJSONSchema(
					"Refactored Code",
					ResponseOutputSchema,
				),
			},
		})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			fmt.Println(response)
		}
	})

	r.Run() // listen and serve on 0.0.0.0:8080
}
