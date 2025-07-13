# "Enhance Text" Feature Implementation

This feature adds an AI-powered "Enhance Text" button to the BlockNote editor's formatting toolbar. When users select text and click the button, it uses Google's Gemini AI to improve grammar, clarity, and readability while preserving the original tone and meaning.

## Features

- **Custom Toolbar Button**: Integrated into BlockNote's formatting toolbar with a sparkles icon
- **AI Enhancement**: Uses Gemini AI to improve selected text
- **Dual Editor Support**: Works with both Editor (LiveBlocks collaborative) and Editor2 (Firebase-only) components
- **User Feedback**: Shows loading states and success/error messages
- **Text Selection**: Only works when text is selected, showing appropriate error messages if no text is selected

## Implementation Details

### Files Added/Modified

1. **lib/gemini.ts** - Gemini AI service for text enhancement
2. **app/api/enhance-text/route.ts** - API endpoint for text enhancement
3. **components/Editor/EnhanceTextButton.tsx** - Custom BlockNote toolbar button component
4. **components/Editor/index.tsx** - Updated to include custom formatting toolbar
5. **components/Editor2/index.tsx** - Updated to include custom formatting toolbar
6. **.env.example** - Added NEXT_PUBLIC_GEMINI_API_KEY

### How It Works

1. User selects text in the editor
2. Clicks the "Enhance Text" button (sparkles icon) in the formatting toolbar
3. Selected text is sent to the Gemini AI API via `/api/enhance-text` endpoint
4. AI processes the text to improve grammar and clarity
5. Enhanced text replaces the original selection
6. User sees success/error feedback via toast notifications

### Technical Implementation

- Uses BlockNote's `FormattingToolbar` and `FormattingToolbarController` for toolbar integration
- Custom button component uses `useComponentsContext()` to access BlockNote's UI components
- Text selection handled through BlockNote's `getSelection()` API
- Text replacement uses `replaceBlocks()` with parsed HTML blocks
- Loading states and error handling with user-friendly messages

## Setup Instructions

1. Install the Google Generative AI package (already done):
   ```bash
   npm install @google/generative-ai
   ```

2. Add your Gemini API key to `.env.local`:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Usage

1. Open a note in the editor
2. Select some text that you want to enhance
3. Look for the sparkles icon (✨) in the formatting toolbar that appears above selected text
4. Click the "Enhance Text" button
5. Wait for the AI to process your text (loading spinner will show)
6. Your selected text will be replaced with the enhanced version

## API Usage

The feature uses the Gemini 2.5 flash model with a carefully crafted prompt that:
- Preserves the original tone and voice
- Focuses on grammar and clarity improvements
- Returns only the enhanced text without explanations
- Maintains the same style while making it more polished

## Error Handling

- Shows error if no text is selected
- Handles API failures gracefully with user feedback
- Includes loading states to prevent multiple simultaneous requests
- Uses toast notifications for all user feedback

This implementation follows BlockNote's best practices for custom toolbar items and integrates seamlessly with both collaborative and single-user editor modes.
