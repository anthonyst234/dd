import { GoogleGenAI, FunctionDeclaration, SchemaType, Type } from "@google/genai";
import { GameState, LocationId } from "../types";

// --- API Configuration ---
// The API key is assumed to be in process.env.API_KEY
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// --- Function Declarations (Tools) ---

const updateGameStateTool: FunctionDeclaration = {
  name: 'updateGameState',
  description: 'Updates the game state based on player actions and story progression. Use this to give items, add clues, change location, or trigger puzzles.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      narrative: {
        type: Type.STRING,
        description: 'The story text describing what happens. Be atmospheric, suspenseful, and detailed.',
      },
      newLocation: {
        type: Type.STRING,
        description: 'The ID of the new location if the player moved.',
        enum: Object.values(LocationId),
      },
      itemAdded: {
        type: Type.STRING,
        description: 'Name of an item to add to inventory (e.g., "Rusty Key").',
      },
      itemRemoved: {
        type: Type.STRING,
        description: 'Name of an item to remove from inventory.',
      },
      clueAdded: {
        type: Type.OBJECT,
        description: 'A new clue found by the player.',
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['name', 'description'],
      },
      memoryTriggered: {
        type: Type.BOOLEAN,
        description: 'Set to true if a flashback or memory sequence is triggered.',
      },
    },
    required: ['narrative'],
  },
};

// --- Service Logic ---

let chatSession: any = null;

const SYSTEM_INSTRUCTION = `
You are the Game Master (GM) for "Echoes of the Forgotten", a mystery thriller RPG.
The player is Alex Rowan, returning to Greybridge to find a missing friend, Maya Hale.
The tone is suspenseful, emotional, and slightly surreal.
There is a hidden truth about a fire 10 years ago that the town is suppressing.

RULES:
1. Keep responses immersive and in the second person ("You see...", "You feel...").
2. Use the 'updateGameState' tool to convey the story and update the game state.
3. If the player asks to move, check if they can. If they can, use 'newLocation'.
4. If the player investigates and finds something, use 'itemAdded' or 'clueAdded'.
5. Characters:
   - Detective Silas Kade (Suspicious, blockading)
   - Evelyn Cross (Librarian, nervous)
   - Jonas Reed (Paranoid, lives in forest)
   - The Whisperer (Cryptic, appears in memories)
6. Do not reveal the full mystery at once. Drop breadcrumbs.
7. When a memory is triggered, make the narrative fragmented and dreamlike.

LOCATIONS:
- Station: Foggy, abandoned feel.
- Town Square: Eerily quiet. 
- Old Library: Dusty, smells of ash.
- Forest: Whispering pines, dark.
- Observatory: Where the "incident" happened.
`;

export const initializeGame = async (): Promise<any> => {
  try {
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [updateGameStateTool] }],
      },
    });

    const result = await chatSession.sendMessage({
      message: "The player has just arrived at the Greybridge Station. Begin the story.",
    });

    return processResponse(result);
  } catch (error) {
    console.error("Failed to initialize game:", error);
    return { narrative: "Connection to the void failed. (Check API Key)", error: true };
  }
};

export const sendPlayerAction = async (action: string, currentState: GameState): Promise<any> => {
  if (!chatSession) {
    return { narrative: "Game session lost. Please restart.", error: true };
  }

  const context = `
    [Current State]
    Location: ${currentState.currentLocation}
    Inventory: ${currentState.inventory.join(', ')}
    Clues: ${currentState.clues.map(c => c.name).join(', ')}
    Trust Levels: ${JSON.stringify(currentState.trust)}
  `;

  try {
    const result = await chatSession.sendMessage({
      message: `${context}\nPlayer Action: ${action}`,
    });
    return processResponse(result);
  } catch (error) {
    console.error("Gemini Error:", error);
    return { narrative: "The whispers are too loud... (API Error)", error: true };
  }
};

const processResponse = (result: any): any => {
    // The SDK handles tool calls automatically in the chat history context usually,
    // but we need to extract the function call arguments to update our React state.
    // We look for the function call in the candidates.
    
    const candidate = result.candidates?.[0];
    const part = candidate?.content?.parts?.find((p: any) => p.functionCall);
    
    if (part && part.functionCall) {
        const args = part.functionCall.args;
        return {
            narrative: args.narrative,
            updates: {
                newLocation: args.newLocation,
                itemAdded: args.itemAdded,
                itemRemoved: args.itemRemoved,
                clueAdded: args.clueAdded,
                memoryTriggered: args.memoryTriggered,
            },
            toolCallId: part.functionCall.id, 
            functionName: part.functionCall.name
        };
    }

    // Fallback if the model decides to just talk text (shouldn't happen with strict tools, but possible)
    const textPart = candidate?.content?.parts?.find((p: any) => p.text);
    if (textPart) {
        return { narrative: textPart.text, updates: {} };
    }

    return { narrative: "...", updates: {} };
};

export const sendToolResponse = async (toolCallId: string, functionName: string, result: any) => {
     // To maintain chat history correctness, we technically should send back the tool response.
     // For this simplified RPG, strictly linear, we might get away with just sending the next user prompt, 
     // but correct implementation requires closing the loop.
     if (!chatSession) return;

     await chatSession.sendMessage({
         content: [
             {
                 part: {
                     functionResponse: {
                         name: functionName,
                         response: { result: "State updated successfully." } // Simple ack
                     }
                 }
             }
         ]
     });
}
