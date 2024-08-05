import os
from openai import AzureOpenAI, AsyncAzureOpenAI
import asyncio

azure_openai_api_key = os.getenv("AZURE_OPENAI_API_KEY")
azure_openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
deployment_name = os.getenv("DEPLOYMENT_NAME_GPT35")
print(azure_openai_api_key, azure_openai_endpoint, deployment_name)

client = AsyncAzureOpenAI(
    api_key=azure_openai_api_key,  
    api_version="2024-02-01",
    azure_endpoint = azure_openai_endpoint
    )

async def makeRequest():
    response = await client.chat.completions.create(
        model = deployment_name,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Does Azure OpenAI support customer managed keys?"},
            {"role": "assistant", "content": "Yes, customer managed keys are supported by Azure OpenAI."},
            {"role": "user", "content": "Do other Azure AI services support this too?"}
        ]
    )

    print(response.choices[0].message.content)
    return response

asyncio.run(makeRequest())