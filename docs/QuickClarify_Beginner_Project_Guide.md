# QuickClarify Project Guide
A beginner guide to the purpose design code and daily operation

QuickClarify helps a reader understand selected text without leaving the webpage. Highlight a passage, press a keyboard shortcut, and a small card shows an answer, an explanation, or code. The project connects a Chrome extension written in JavaScript to a local Python backend, which calls an OpenAI model in live mode.

This guide is for a colleague who is new to software projects. You do not need to understand APIs, servers, browser extensions, or AI before starting. Each chapter introduces the words it uses, explains the reason behind a design choice, and connects that choice to the actual project files.

By the end, you should be able to explain the project to someone else, follow a request through the code, run it locally, and distinguish a browser problem from a backend or API problem. You should also know where the API key belongs and what must stay out of GitHub.

The most important fact is that the extension and backend are separate programs. Installing the extension does not start Python. Chrome handles the webpage; Python handles the server request; OpenAI generates the live answer. The Python server must remain running for live requests to work.

The guide describes the repository version reviewed on 10 November 2026. Example answers illustrate intended behavior; an AI model may phrase them differently or make mistakes. No private API keys, personal billing details, or machine-specific configuration are included.

Repository: https://github.com/tvivekanandareddy/QuickClarify---AI-Powered-Chrome-Extension

## Reading map

Read chapters 1 to 4 first for the basic idea. Chapters 5 to 14 explain the implementation. Chapters 15 to 20 cover setup, operation, testing, and privacy. Chapters 21 to 25 answer design questions and provide a presentation script, code examples, and references.

- [1 What the project does and why it exists](#1-what-the-project-does-and-why-it-exists)
- [2 The basic words you need first](#2-the-basic-words-you-need-first)
- [3 Why JavaScript and Python are both used](#3-why-javascript-and-python-are-both-used)
- [4 What happens after the keyboard shortcut](#4-what-happens-after-the-keyboard-shortcut)
- [5 A map of the source code](#5-a-map-of-the-source-code)
- [6 How the Chrome extension is defined](#6-how-the-chrome-extension-is-defined)
- [7 What the service worker does](#7-what-the-service-worker-does)
- [8 How selected text becomes an on page card](#8-how-selected-text-becomes-an-on-page-card)
- [9 The popup preferences and local history](#9-the-popup-preferences-and-local-history)
- [10 The Python backend in plain language](#10-the-python-backend-in-plain-language)
- [11 Understanding the request and response](#11-understanding-the-request-and-response)
- [12 How prompts control the kind of help](#12-how-prompts-control-the-kind-of-help)
- [13 A worked arithmetic example](#13-a-worked-arithmetic-example)
- [14 A worked coding problem](#14-a-worked-coding-problem)
- [15 Configuration secrets and GitHub](#15-configuration-secrets-and-github)
- [16 First time setup of the Python server](#16-first-time-setup-of-the-python-server)
- [17 Chrome installation and everyday operation](#17-chrome-installation-and-everyday-operation)
- [18 Troubleshooting by following the request path](#18-troubleshooting-by-following-the-request-path)
- [19 How the project is tested](#19-how-the-project-is-tested)
- [20 Privacy costs and performance boundaries](#20-privacy-costs-and-performance-boundaries)
- [21 Why these design choices were made](#21-why-these-design-choices-were-made)
- [22 More questions a colleague may ask](#22-more-questions-a-colleague-may-ask)
- [23 A demonstration and explanation you can give](#23-a-demonstration-and-explanation-you-can-give)
- [24 A request shown in JavaScript and Python](#24-a-request-shown-in-javascript-and-python)
- [25 Glossary sources and further reading](#25-glossary-sources-and-further-reading)

## 1 What the project does and why it exists
### The problem we wanted to solve
Imagine reading an article and finding a sentence you do not understand. You could copy it, open another application, write a request, wait for an answer, and return to the article. QuickClarify puts the request and answer closer to the text so that you can continue reading with less interruption.

The motive is practical learning assistance. It helps explain unfamiliar ideas, answer selected questions, and suggest solutions to programming problems. It does not replace learning, source checking, or testing code.

### What a user actually does
1. Open a regular webpage in Chrome.
2. Drag across the text you want help with.
3. Press Command+Shift+K on Mac or Ctrl+Shift+K on Windows or Linux.
4. Read the card that appears on the page.
5. Choose another explanation length if you need more or less detail.

The shortcut can be changed in Chrome. The extension also offers a right-click action and a popup where you can paste text manually.

### Three types of selected content
A paragraph or concept should receive a plain-language explanation. A direct question should receive an answer, rather than a repetition of the question. An algorithm problem should receive working code. For example, a discount question needs the final price, while a general problem about counting perfect squares needs a reusable implementation.

These are instructions to the AI model, not three separate mathematical engines. The model interprets the selected text using the backend prompt. That distinction explains both the flexibility and the possibility of mistakes.

### What this project is not
QuickClarify is not a newly trained AI model. It is an application built around an existing model. It is not a search engine: the current request does not enable web-search tools. It is not a fully hosted service: the supplied backend runs locally. It is not currently distributed through the Chrome Web Store; the documented installation uses an unpacked folder.

### A useful first explanation
QuickClarify is a Chrome extension that sends text I select to my local Python server. The server asks an AI model for the right kind of help, and the extension shows the response on the webpage.

## 2 The basic words you need first
### Frontend and backend
The frontend is the part a user interacts with. In this project, that includes the popup, buttons, and answer card in Chrome. The backend is the program that receives the request and prepares the AI call. Here it is a Python application using FastAPI.

A server is a program that waits for requests and responds. It does not have to be a separate physical computer. QuickClarify's server runs on the same laptop as Chrome.

### API request and response
An API is an agreed interface for one program to communicate with another. A restaurant menu is a useful comparison: it lists the requests a customer may make. Our backend offers an endpoint called /api/explain. The extension sends a request containing text and preferences; the server sends back a response containing the result.

An endpoint is a particular address and action offered by an API. GET /health asks whether the backend is running. POST /api/explain submits content for an answer. GET and POST are HTTP methods: names that describe how a request is being used.

### JSON and HTTP
JSON is a text format for structured data. It uses named fields so both programs understand which value is the selected text and which value is the explanation length. HTTP is the communication protocol used to send the request. JSON is the package contents; HTTP is the delivery system.

### Localhost port and process
127.0.0.1 means this computer. Port 8000 identifies the listening service on that address. Think of the address as a building and the port as a door. Another computer's 127.0.0.1 points to that other computer, not to your laptop.

A process is a running instance of a program. Closing the terminal that runs the Python server can stop that process. Having the files on disk does not mean the server is running.

### Library framework and SDK
A library supplies reusable code. A framework provides a structure for an application; FastAPI does that for our server. An SDK is a toolkit for a service; the OpenAI Python SDK handles the model API requests. We still write the application logic around these tools.

## 3 Why JavaScript and Python are both used
### Why JavaScript is in the extension
Chrome exposes extension features through JavaScript APIs. Our JavaScript registers shortcut handlers, reads selected text through browser interfaces, sends messages between extension components, and updates the page. It is running in the environment where the webpage and extension APIs exist.

HTML describes the popup's elements, such as the textarea and buttons. CSS controls their appearance, spacing, and colors. JavaScript makes those elements respond to actions. For example, a button drawn in HTML does not know how to request an explanation until JavaScript attaches a handler.

### Why Python is in the backend
Python makes the request validation, prompt construction, and OpenAI integration easy to read and maintain. FastAPI supplies routing and validation support; the OpenAI SDK supplies an asynchronous client. Keeping the key on the server also keeps it out of the extension package.

Python is a design choice for this backend, not a requirement imposed by OpenAI. A JavaScript backend could do the same job. We chose a Python backend while retaining JavaScript for browser-specific work.

### Could we use only Python
Not as a conventional Chrome extension with the current design. Chrome does not directly load Python files as extension service workers or content scripts. Browser Python runtimes or transpilation would add a runtime and interoperation layer; they would still need a bridge to the browser's JavaScript APIs. They would not simplify this small extension.

A separate Python desktop app could use a different interaction model, but that would be a different application. It would not automatically have the same permission-controlled access to Chrome's selected text.

### Could we use only JavaScript
Yes, by implementing a backend in a JavaScript server runtime such as Node.js. That would change the backend language, not eliminate the need to protect credentials. Putting a reusable secret directly inside an extension distributed to other people would expose it to those users.

### Why not React
The interface is small enough for ordinary HTML, CSS, and JavaScript. The current repository needs no frontend build pipeline. React could help a larger interface, but introducing it here would add tooling without being necessary for the existing features.

## 4 What happens after the keyboard shortcut
### The complete journey
1. You highlight text. At this point nothing has been sent to OpenAI.
2. Chrome recognizes the configured clarify-selection command.
3. background.js receives the event and identifies the active tab.
4. It injects selection.js into that tab. The script returns the selected text.
5. background.js injects content.js and sends it a SHOW_CARD message.
6. content.js creates the card and checks whether the selection is empty or too long.
7. The card reads the saved length and custom instructions from local extension storage.
8. It sends an EXPLAIN message to the service worker with text, length, and prompt.
9. The service worker sends an HTTP POST request to the local FastAPI endpoint.
10. Python validates the body, builds instructions, and calls OpenAI in live mode.
11. The response returns through the backend and service worker to the card.
12. The card displays the answer as text. You can copy it or request another length.

### Where each part runs
| Part | Location | Responsibility |
| Chrome page and extension | Your computer | Selection, shortcut, interface, and messages |
| FastAPI backend | Your computer | Validation, configuration, prompt, and API call |
| OpenAI model service | External service reached over the internet | Generating the live response |

### Why there are two kinds of communication
Extension components use Chrome messages, such as SHOW_CARD and EXPLAIN, to talk inside the browser. The service worker uses HTTP to talk to Python. These are different channels because the Python server is not part of Chrome's extension runtime.

The response retraces the communication path. The Python server cannot directly insert a card into the webpage; it returns JSON. The extension then decides how to display that JSON.

### Why the card can open before an answer arrives
Opening the card and generating an answer are separate operations. The card first shows a loading message. If the server is offline, the card can still appear and show an error. Therefore, seeing the card proves that browser injection worked; it does not prove that the Python server or AI service is available.

## 5 A map of the source code
The repository separates browser behavior, backend behavior, tests, and documentation. Start with this map before reading individual functions.

| File or folder | What to look for |
| extension/manifest.json | Chrome permissions, popup entry point, and shortcut |
| extension/background.js | Command events, Chrome messaging, fixed backend URL |
| extension/selection.js | Selected-text extraction before the card takes focus |
| extension/content.js | On-page card, loading state, length buttons, copying |
| extension/popup.html | Popup structure and labels |
| extension/popup.css | Popup visual appearance |
| extension/popup.js | Preferences, history, popup requests, playground mode |
| extension/index.html | Redirect into the browser playground |
| backend/main.py | Request models, routes, prompts, demo responses, OpenAI call |
| requirements.txt | Python packages needed to run and test the project |
| tests/ | Automated backend and JavaScript checks |
| .github/workflows/ci.yml | Checks run by GitHub after pushes and pull requests |

### Configuration is separate from source code
.env.example is the shareable template. .env is each developer's private local configuration. .gitignore tells Git which local files to leave out. README.md explains installation; SECURITY.md explains key handling and the local deployment boundary.

The extension folder does not contain the Python server. Loading that folder in Chrome installs only the browser component. The backend folder does not contain the Chrome installation. This is why there are two setup steps.

### A sensible reading order
Read manifest.json first so you know what Chrome loads. Then follow background.js to selection.js and content.js. Read backend/main.py when you reach the HTTP request. Finish with popup.js, which adds preferences and history around the same API workflow.

You do not need to memorize every CSS property to explain the project. Focus first on where data enters, what validates it, which function calls OpenAI, and where the result is displayed.

## 6 How the Chrome extension is defined
### What manifest means
manifest.json is the extension's configuration document. Chrome reads it to learn the extension's name, version, entry points, permissions, and commands. It is JSON data, not Python code and not a script that runs by itself.

The project uses Manifest V3. Its background entry points to background.js as the service worker. Its action entry points to popup.html as the window opened from the toolbar. Its commands entry defines clarify-selection and suggests a keyboard combination.

### Why each permission exists
| Permission | Use in this project |
| activeTab | Temporary access to the active page after an authorized user action |
| scripting | Inject selection.js and content.js when invoked |
| storage | Save preferences and popup history locally |
| contextMenus | Offer Explain with QuickClarify on selected text |
| Local host permissions | Allow requests to the backend on localhost or 127.0.0.1 at port 8000 |

The extension does not declare a persistent content script for every website. It injects scripts when the user asks for help. This reduces unnecessary background page access. It does not mean permissions provide a complete security guarantee; the code and the surrounding system still matter.

### How the shortcut is connected
The command name in manifest.json must match the name checked by chrome.commands.onCommand in background.js. A shortcut is not detected by an ordinary webpage key listener. Chrome dispatches the registered extension command.

The suggested key may conflict with another extension. Chrome's shortcuts page lets the user assign an available combination. The popup queries the actual registered commands so it can show the shortcut Chrome assigned, rather than assuming the suggestion was accepted.

### Why Chrome sometimes refuses access
Chrome restricts extension access on internal pages and certain protected contexts. The same logic may not work in a PDF viewer, the Web Store, or an inaccessible embedded frame. The popup's manual paste workflow is the fallback. A permission cannot make every browser surface readable.

References for these browser concepts are listed at the end of the guide.

## 7 What the service worker does
### A browser coordinator
background.js acts as a coordinator. It does not draw the answer card, and it does not contain the API key. It receives Chrome events, injects scripts, routes messages, and makes requests to the fixed backend address.

A Manifest V3 service worker is event driven. Chrome may stop it when it is idle and start it again for an event. It is not the same process as the Python backend, and its lifecycle does not control whether Python is running.

### Events instead of a constant loop
chrome.commands.onCommand.addListener registers a function to run when the shortcut command occurs. chrome.contextMenus.onClicked.addListener handles the right-click path. chrome.runtime.onMessage.addListener handles messages from the popup or card.

An event listener is a function registered to react later. Registering it does not immediately make an AI request. For example, the command handler first reads the selection; the card later asks for the explanation.

### Reading the actual request code
The worker uses fetch with method POST, a JSON Content-Type header, and JSON.stringify(payload). fetch sends the HTTP request. JSON.stringify turns the JavaScript object into JSON text. response.json reads JSON returned by the server. If the response status is not successful, the code turns its detail into a user-facing error.

The API address is a constant pointing to http://127.0.0.1:8000. A page cannot simply provide an arbitrary URL for the worker to fetch through this message route. That is a useful restriction on the proxy's behavior.

### Why async and await appear
A network request takes time. async marks a function that can perform asynchronous operations; await pauses that function until an operation finishes while allowing other work to proceed. It does not mean that a second CPU is calculating the answer.

The Chrome message listener returns true while an asynchronous task is still pending. This keeps the response channel available for the later reply. The code checks the extension sender ID before handling these internal messages. That check is not authentication for the separate local HTTP server.

## 8 How selected text becomes an on page card
### Why selection capture needed its own file
selection.js reads the selection before the card receives focus. Ordinary pages expose selection through getSelection. Other pages place content inside text fields, component shadow roots, or accessible embedded documents. One simple selection call did not cover all of those situations during development.

The reader first considers the focused field or component, then ordinary selection, then accessible roots. It can read the selected substring of supported text fields and same-origin frame documents. It also tries DOM ranges when a selection object has a range but its string is empty.

DOM means Document Object Model: the browser's structured representation of page elements. A range identifies a part of that structure. A shadow root is a component's separate DOM subtree. Same origin means the frame and parent satisfy the browser's origin-access rules; cross-origin content remains restricted.

### What happens when there is no usable selection
The card gives guidance instead of calling OpenAI with empty text. If the selected text exceeds 6000 characters, the on-page workflow asks for a smaller selection. Focused password fields are explicitly skipped by the selection reader. This is a targeted guard, not a general guarantee that any selected sensitive text will be detected.

### How the card stays visually separate
content.js creates a host element and attaches a closed Shadow DOM containing the card. This isolates much of the card's internal structure and styling from the host webpage. It helps prevent a site's CSS from unexpectedly changing the buttons or answer layout.

A closed shadow root is an encapsulation choice, not an encryption mechanism or a promise that the website cannot observe any effects. The host still exists on the webpage.

### Why displaying text safely matters
The static card template is written by the application. Selected text and generated answers are inserted with textContent rather than interpreted as HTML. Thus, a model answer containing a script tag is shown as text instead of being deliberately executed as page markup.

Each injected content script is guarded so repeated invocations do not register another listener in the same page context. A new card dismisses the old one. Escape or the close button removes the card and its keyboard handler.

## 9 The popup preferences and local history
### Why there is a popup if the shortcut works
The shortcut is the quickest reading workflow. The popup supplies configuration, a place to paste text, and access to recent popup answers. It is useful when the page blocks selection access or when you want to change the default length before using the shortcut.

popup.html supplies the controls. popup.css styles them. popup.js listens to the controls, reads saved settings, sends requests, and updates the results.

### What is saved and where
In an installed extension, chrome.storage.local saves the selected default length, custom prompt, and recent popup history on the device. In the standalone browser playground, the same interface uses the page's localStorage instead. These are different storage areas, so settings saved in the playground do not automatically configure the installed extension.

The latest 20 successful popup explanation entries are retained. Each entry contains the original text, response details, selected length, and time. Clearing recent explanations removes that saved list. Answers generated directly in an on-page card are not added to this history.

### How preferences affect a request
A saved instruction such as Use Java for coding problems is read into the prompt field sent to the backend. The backend combines it with the main tutor instructions and length guidance. Changing an answer's length requests a fresh answer; it does not simply shorten the old text locally.

A request sequence counter in the card prevents an older response from replacing a newer result if the user changes lengths quickly. It does not cancel the earlier server request or guarantee that the earlier API call will not be billed.

### Does the app remember a conversation
No conversation transcript is sent to OpenAI. The current request contains the selected text and preferences. Local history is a convenience for revisiting results, not model memory. Reopening a history entry displays the saved response; it does not make the model remember an ongoing conversation.

### Why the playground exists
FastAPI serves the extension's static interface files so the popup can also be tried in a normal browser tab. The playground is useful for interface checks; it cannot prove that Chrome-specific permissions, shortcut registration, or page injection work correctly.

## 10 The Python backend in plain language
### FastAPI and Uvicorn do different jobs
FastAPI describes the API routes, request shapes, validation, and responses. Uvicorn is the ASGI server process that listens for HTTP requests and runs the FastAPI application. The command backend.main:app means import backend/main.py and use the object named app.

A decorator such as @app.post('/api/explain') associates an HTTP route with the Python function below it. When the extension submits that request, FastAPI calls explain after validating the request body.

### Why validation happens before the model call
ExplainRequest is a Pydantic model. It describes which fields are expected and what limits apply. text must contain 1 to 6000 characters, and a validator rejects whitespace-only input after trimming. prompt allows up to 1000 characters. length must be one of the three enum values: one_line, standard, or detailed.

An enum is a named set of allowed choices. It prevents accidental modes such as enormous or briefest from silently entering the workflow. Invalid requests receive HTTP 422 rather than consuming an AI request.

### The two execution paths
If DEMO_MODE is true, explain selects from prepared sample responses and returns a demo label. It makes no OpenAI call. Unknown selections receive setup guidance.

If demo mode is false, the backend checks for the API key, selects the configured model, builds the instructions, and calls client.responses.create. It reads response.output_text and checks that the response completed. It then returns an Explanation response with the text, length, demo flag, and model identifier.

### Why the route is asynchronous
The backend spends time waiting for OpenAI over the network. AsyncOpenAI and await let the event loop handle other waiting work rather than blocking it with a synchronous network call. This does not remove API latency or make the current request instantaneous.

### What the backend does not do
It does not train a model, read the webpage directly, store responses in a database, or execute generated code. It has no authentication or rate limiter. Those are important boundaries when deciding whether the application is suitable for public server deployment.

## 11 Understanding the request and response
### A request example
The extension submits a JSON body to POST /api/explain. The example below contains no secret key because the server supplies its own credential separately.

```json
{
  "text": "What is an API?",
  "length": "standard",
  "prompt": "Explain for a beginner."
}
```

text is the material to help with. length selects the desired level of detail. prompt is the user's optional style preference. A word in the selected passage is not automatically a configuration setting; it remains subject matter for the model.

### A response example
The sentence below is illustrative; the exact model wording can vary.

```json
{
  "explanation": "An API lets programs communicate.",
  "length": "standard",
  "demo": false,
  "model": "gpt-4.1-mini"
}
```

The field remains named explanation even when it contains an answer or source code. The extension uses that single field to display all result types. model identifies the configured API model, not a model trained specifically for this project.

### How failures are represented
| HTTP status | Meaning in this backend |
| 200 | The request completed successfully |
| 422 | Input does not meet the expected request shape or limits |
| 503 | Live mode has no API key configured |
| 429 | OpenAI reported a rate or quota limit |
| 502 | OpenAI connection, completion, or upstream rejection problem |
| 504 | The OpenAI request timed out |

The worker tries to display the returned detail message. A generic 502 can represent different upstream causes; the current application deliberately avoids returning private credential information. A successful health check proves the local server is responding, not that an OpenAI generation will succeed.

## 12 How prompts control the kind of help
### A prompt is an instruction sent with a request
The backend combines TUTOR_INSTRUCTIONS, the selected GUIDANCE entry, and the user's custom prompt. It also includes the selection as user content. The instructions tell the model how to interpret the task and how to format its answer.

The application does not use a separate classifier function with a list of question marks or keywords to select a route. The model infers whether the text is a coding problem, a question, or explanatory prose from the instructions and selection. This allows varied wording, but classification can be wrong.

### Why the first version explained questions instead of answering them
A general instruction to explain selected text encourages paraphrasing. The later instructions explicitly tell the model to answer questions, calculate numerical results, and lead with the final answer. This is a prompt change, not new model training.

Similarly, an algorithm problem can look like a mathematical statement. We added instructions to recognize general input problems and provide a complete implementation, including when the selection does not include examples or a question mark.

### What the three length modes request
For ordinary text, One line requests a short sentence. Standard and Detailed request progressively more explanation. For coding problems, code is exempt from the prose word limit so the answer can remain complete. An explicitly requested language takes precedence over a saved preference; Python 3 is the fallback.

These length and formatting rules are requested behavior. The application does not count the generated words or enforce a code parser after generation. Consequently, a model may still produce extra sentences, omit a step, or format code unexpectedly.

### Why untrusted text is mentioned
A webpage could contain a sentence such as ignore all previous instructions. The prompt tells the model to treat selected material as subject matter rather than as authority to change the application's rules. This helps separate a question to answer from an instruction to override the assistant. Prompt instructions alone do not eliminate all prompt-injection risk.

### Does the model see the whole page
No. The current request does not include the URL, surrounding article, prior answers, files, or browsing history. If the selected fragment depends on missing context, the answer may be incomplete. Select enough relevant text while staying within the limit.

## 13 A worked arithmetic example
### The selected question
A store offers a 20 percent discount on an item originally priced at 250 rupees. At the register, a further 5 percent discount is applied. What is the final price?

The intended answer is 190 rupees. The second discount applies to the already reduced amount, so adding 20 and 5 to claim a 25 percent total discount would be incorrect.

### The calculation step by step
1. Twenty percent of 250 rupees is 50 rupees.
2. Subtract 50 from 250. The first discounted price is 200 rupees.
3. Five percent of 200 rupees is 10 rupees.
4. Subtract 10 from 200. The final price is 190 rupees.

The same calculation can be written in ordinary programming notation:

```text
250 * 0.80 * 0.95 = 190
```

0.80 means 80 percent of the original amount remains after the first discount. 0.95 means 95 percent of the new amount remains after the second discount. These multipliers are applied in sequence.

### How the modes should differ
One line should include the answer immediately, for example: The final price is 190 rupees after applying the two discounts successively.

Standard should give the answer and the main calculation. Detailed can additionally explain why successive discounts are not added and show the amounts saved at each stage. The question asks for a specific number, so code is unnecessary unless the user separately asks for an implementation.

### Does Python calculate the result itself
No. The current backend asks the AI model to perform and check the arithmetic. There is no dedicated calculator or tool-execution step in the API call. A correct answer in a test is evidence for that case, not a mathematical guarantee for every future request.

If reliable numerical computation became a core requirement, a future version could use a constrained calculator or verified code tool. That would require its own validation and security design; it is not part of the current implementation.

### Why this example matters
It demonstrates that a useful response must satisfy the user's task. Repeating the discounts in simpler words is an explanation of the question; giving 190 rupees actually answers it. The prompt was refined to make that distinction explicit.

## 14 A worked coding problem
### The selected problem
Given a positive integer n, count the positive perfect squares strictly smaller than n. The sequence starts at 1, so zero is not included. For n = 9, the squares are 1 and 4, giving 2. For n = 3, only 1 qualifies, giving 1.

This describes a general algorithm for different inputs. It should receive reusable code, rather than only the answer for one example or a verbal formula.

### An example Python solution
```python
from math import isqrt


def count_squares(n: int) -> int:
    return isqrt(n - 1)
```

from math import isqrt imports Python's integer square-root function. def introduces a function. n: int indicates that n is intended to be an integer; the annotation alone does not validate arbitrary values at runtime. The return statement supplies the function's result.

isqrt(x) returns the largest integer whose square is at most x. We use n - 1 because the requirement is strictly less than n. When n is 9, using isqrt(9) would incorrectly include 9 itself; isqrt(8) returns 2.

### Check the boundary cases
| n | Qualifying positive squares | Result |
| 1 | None | 0 |
| 3 | 1 | 1 |
| 9 | 1 and 4 | 2 |
| 10 | 1 and 4 and 9 | 3 |

The solution assumes the stated positive-integer constraint. It does not separately handle negative inputs or strings. It avoids a loop over all candidate squares and avoids relying on a floating-point square root. For fixed bounded input sizes, the work is small; exact integer-operation cost depends on the size of the integer.

### What the extension actually does with this code
It displays the AI-generated code as text. It does not run it or prove its correctness. Review and test generated code before use. A coding platform may require a particular class, function name, or input/output format. Include that required signature in the selected text so the model can preserve it.

Standard should add a brief explanation and complexity discussion. Detailed should add a walkthrough and edge cases. One line still needs complete code, even if that code occupies several physical lines.

## 15 Configuration secrets and GitHub
### Why a private environment file exists
Configuration can change between computers without changing the source code. .env supplies local settings. python-dotenv loads them into the backend's environment, and os.getenv reads them. An environment variable is a named value available to the running process.

The shareable template contains these settings with an empty credential:

```dotenv
DEMO_MODE=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

DEMO_MODE controls prepared samples versus real generation. OPENAI_API_KEY holds each developer's own credential in their local .env. OPENAI_MODEL selects the model. The repository's default identifier is a configuration choice, not a claim that it is the newest model. Check model availability before using it.

### Why the key must not be in the extension
An extension package is available to the person who installs it. If a shared key were embedded in JavaScript, that person could inspect and reuse it. A server-side key avoids packaging the credential with the extension. A local .env is still a plaintext file, not an encrypted vault; protect access to the computer and file.

### What Git does and does not ignore
.gitignore excludes .env and its variants, local environments, logs, caches, and private key files. It explicitly allows .env.example. Git stores version history; GitHub hosts a copy of the chosen repository history.

An ignore rule does not remove a secret already committed in the past. If a key is accidentally exposed, revoke it and replace it; deleting the visible file alone does not revoke the credential or erase history. Before publishing, review both the files and Git history for secrets.

### What a colleague needs to supply
A colleague clones the public source, creates their own .env, supplies their own API key, and runs their own backend. Your private file is not part of their download. The public README explains these steps. Nobody needs your key, account password, personal path, or billing details to understand or install the project.

Restart the backend after changing .env because this application loads environment values when the Python module starts. Existing shell environment variables can also affect configuration; do not assume editing the file always overrides them.

## 16 First time setup of the Python server
### Get the files and choose a terminal
Install Python 3.10 or newer and Chrome. Download the repository ZIP or clone the public repository. Open a terminal inside the extracted project folder. A terminal is a window where commands are typed; the working directory determines which relative file paths those commands use.

### On macOS or Linux
```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The first command creates a project-specific Python environment. Activation makes the shell use that environment's Python. pip installs the dependencies listed in requirements.txt. cp makes a private working copy of the template. Uvicorn starts the listening backend. Keep that terminal open.

Do not repeat the copy command over an existing .env containing your key; it would replace your local settings. Create the file only on first setup or make a backup before intentionally replacing it.

### On Windows PowerShell
```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn backend.main:app `
    --host 127.0.0.1 --port 8000
```

These commands call the environment's Python directly, so activation is not required. The backtick at the end continues the PowerShell command on the next line; copy both lines together.

### Confirm the server works before adding a key
Open http://127.0.0.1:8000/health. A successful response includes status ok and demo true for the template configuration. Open /popup.html on the same server to try a demo sample. Demo mode does not require API billing.

To enable live mode, edit .env locally, set DEMO_MODE=false, and add your own API key. Restart the server. A funded, authorized API project and a supported model are needed for live generation. Do not send keys in chat or screenshots. API key setup and current pricing should be checked in the provider dashboard.

## 17 Chrome installation and everyday operation
### Install the browser component
1. Open chrome://extensions in Chrome.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the extension folder containing manifest.json, not the repository's outer folder.
5. Pin QuickClarify if you want easy access to its popup.
6. Open a regular webpage and refresh it if necessary.
7. Highlight a sentence and press the shortcut, or use the right-click action.

Developer mode lets Chrome load the source folder directly for local development. It does not upload the extension to the Web Store. The Python server is a separate process and still needs to be started.

### Starting it again on another day
You do not need to reinstall dependencies or recreate .env each day. Open a terminal in the project folder and run the existing environment's Python:

```sh
.venv/bin/python -m uvicorn backend.main:app \
    --host 127.0.0.1 --port 8000
```

The backslash continues this macOS or Linux command on the next line. On Windows, use the PowerShell server command from chapter 16 instead. Leave the terminal running. Stop the server with Ctrl+C. After stopping, the extension can still open its interface but cannot receive live answers from that backend.

### Why restarting the computer changes things
The current project has no login service or auto-start installation. A reboot, logout, or terminated terminal can stop the backend. Chrome loading the extension does not automatically launch a local executable. Automatic startup would require separate operating-system configuration or another explicitly designed integration.

### What to reload after a change
A Python change needs a backend restart, unless development reload mode is enabled. A change to extension files needs Reload at chrome://extensions, followed by a refresh of the webpage so old injected scripts are removed. A changed API key or demo flag needs a server restart. These operations solve different problems.

### Is the local address a public website
No. The URL points at your computer. Sharing the URL with a colleague does not share your running service. Each colleague can run their own local copy, or a future version could use a deliberately hosted backend with appropriate controls.

## 18 Troubleshooting by following the request path
### Check the simplest layer first
If the shortcut does nothing, inspect Chrome's registered shortcut and confirm the extension is enabled. If the card opens, the browser command and injection path worked at least far enough to draw the interface. Next check the selected quotation. If it is empty, focus on selection capture rather than API billing.

| Symptom | Likely checks or next step |
| Nothing opens | Check shortcut assignment, extension state, and page restrictions |
| Card asks you to highlight text | Close it, select readable text, and retry after refreshing the page |
| Selection is too long | Choose up to 6000 characters or paste a shorter excerpt |
| Backend offline or Failed to fetch | Start the server and check /health at port 8000 |
| Demo preview message | Check DEMO_MODE and restart after enabling live mode |
| Quota or rate limit reached | Check API project credits and usage limits; allow for temporary rate limits |
| Key or model rejected | Check Responses permissions, key expiration, model name, and project access |
| Answer takes too long | Check connectivity, shorten the selection, and retry |
| New code seems ignored | Restart Python or reload the extension according to the changed component |

### What the health endpoint can prove
If /health does not respond, the browser-to-local-server step is not working. If it responds with demo false, the server is running in live mode. That response does not verify API credentials, model access, billing, or an internet connection to OpenAI; a generation request tests those later steps.

### Why an answer can still be unsatisfactory
An incorrect or poorly framed answer is different from a transport failure. Check whether the selection includes enough context and whether custom instructions are appropriate. If a coding answer lacks the required signature, select that signature too. Prompt improvements can help, but should not be described as a guarantee of correctness.

### How to ask for debugging help safely
Report which step fails, the visible error, whether /health responds, and whether demo mode works. You may share a sanitized selection that reproduces the problem. Remove private text and credentials from screenshots and logs. Never paste the API key to prove it is configured.

## 19 How the project is tested
### Automated tests check repeatable behavior
The Python tests use FastAPI's TestClient to submit requests without opening Chrome. A fake OpenAI client returns a controlled response. This verifies that the application sends the intended request fields and handles the resulting response without paying for a live model call.

The JavaScript tests use Node's test runner and a mocked Chrome API. A mock is a replacement that behaves predictably for a test. For example, a fake shortcut event supplies a tab, and the test checks which selection and message are forwarded.

### What the current tests cover
Backend tests cover the three demo lengths, empty and overly long inputs, invalid modes and prompt length, missing keys, the live request structure using a mock, the health route, and static preview delivery. They check that store=False is included in the mocked OpenAI call.

Extension tests cover shortcut dispatch, active-tab fallback, empty selection guidance, restricted-page handling, the fixed API destination, and unrelated commands. Selection tests cover ordinary text, accessible shadow roots and same-origin frames, selected textarea content, focused password exclusion, and range fallback.

The reviewed suite contains 12 Python test cases and 12 JavaScript test cases. A passing count describes these checks; it does not mean every website or every generated answer has been tested.

### How to run the checks
```sh
python -m pytest -q
node --test tests/test_extension.cjs
```

Run the first command using the project's environment after installing requirements. Node.js 20 or newer is needed for the second command. Node is a test tool here; the installed extension itself runs in Chrome and does not require the user to install Node.

### What still needs manual and live testing
Mocked tests do not prove actual Chrome permission behavior, clipboard access, shortcut conflicts, or model answer quality. Manually load the extension and test a real page. For prompt changes, use a small evaluation set containing questions, paragraphs, and coding problems; check the actual outputs. Such live evaluations may incur API charges.

GitHub Actions runs the automated checks after pushes and pull requests using demo mode and no real API key. CI means continuous integration: automated validation when repository changes are proposed or published.

## 20 Privacy costs and performance boundaries
### What leaves the computer
In live mode, selected text and custom instructions are sent from the local backend to OpenAI with the application instructions. The project does not intentionally include the page URL, surrounding page text, browser history, or private .env file in that content payload. The SDK separately uses the API key to authenticate the request.

The backend passes store=False. This disables storing that response for later API retrieval under the relevant API behavior; it does not promise that all provider retention is disabled. Review the provider's current data policies before submitting sensitive material.

### What stays local
Preferences and popup history are stored in the browser on the device. The backend has no application database. A local history entry can still contain sensitive selections, so local storage should not be confused with encryption or a confidential document vault.

The server listens only on 127.0.0.1. That limits network exposure, but it is not user authentication. Other local programs can potentially reach a loopback service. The application is not prepared to be exposed publicly without authentication, rate limits, HTTPS, and a deployment review.

### What can cost money
Live API generation consumes the API project's usage allowance or balance under current account terms. Do not assume that a ChatGPT subscription automatically funds this API-key integration; check the actual API dashboard, including any current credit eligibility. Model prices and account offers can change.

Selecting a different length makes a new generation request. Closing the card or ignoring an older response does not guarantee cancellation of work already sent. The demo path and mocked automated tests make no paid OpenAI calls.

### Why answers take time
The selection, browser message, local request, external network call, and generation all contribute to latency. The OpenAI client timeout is configured to 22 seconds with no SDK retries. The extension's explanation request timeout is 28 seconds. The backend caps generated output at 1800 tokens. A token is a model text unit, not necessarily a word.

There is no streaming response: the card waits for the full result. Output caps and timeouts can cause incomplete responses. These controls bound some work but are not a hard spending cap or a guarantee that a response will always fit.

## 21 Why these design choices were made
### Why use FastAPI instead of plain Python alone
Python alone can implement an HTTP server, but FastAPI already supplies route handling, request parsing, validation integration, and generated API documentation. Using it reduces the amount of infrastructure code we need to maintain. Flask or another framework could also work; FastAPI is suitable, not uniquely capable.

### Why not call OpenAI directly from the webpage
A backend keeps the credential out of the extension distribution and centralizes validation and prompt behavior. The extension can remain focused on browser interactions. A different design could accept each user's key inside the extension, but then it would need a careful local credential-storage design. We did not implement that design.

### Why no database or user login
The current product is a local tool for one developer's browser. Preferences and limited history fit local storage. A database or account service would add setup, authentication, persistence management, and operational responsibility. Those components become useful if requirements change; their absence is appropriate to the current local scope.

### Why use a fixed backend address
A fixed loopback destination makes setup and request routing simple. It also prevents this message proxy from fetching arbitrary page-supplied URLs. The tradeoff is that changing the backend host or port requires updating the extension configuration and permissions. There is no current hosted-service selector.

### Why separate the files
A selection bug should be investigated in selection.js, while a prompt issue belongs in main.py. Splitting responsibilities helps locate faults and test smaller units. It also explains why changing model instructions did not require rebuilding the browser interface.

### Which future improvements are still proposals
Possible improvements include an explicit coding-language selector, better code presentation, streaming output, local-model support, background startup, stronger response validation, and authenticated hosting. These are not current features. Building them would require changes and tests, rather than merely changing a README claim.

The extension does not run the generated code, and this should remain a separate, carefully designed capability if ever added. Displaying text and executing arbitrary programs have very different consequences.

## 22 More questions a colleague may ask
### Is JavaScript the same as Java
No. They are different languages despite similar names. The Chrome extension uses JavaScript. A model-generated Java solution is just answer content; it does not change the language the extension itself runs.

### Did we build GPT or fine tune a model
No. We built an application that calls an existing model. Editing TUTOR_INSTRUCTIONS changes the request guidance. Training or fine-tuning changes a model through a separate process, which this project does not perform.

### Does public source mean somebody gets our API key
The published source includes an empty environment template. Each person provides their own credential locally. This separation depends on keeping real secrets out of the committed files and history; publishing code alone does not automatically publish an untracked .env.

### Can it work with no internet
The prepared demo path can run locally once dependencies are installed. Live OpenAI generation needs internet access. The project does not currently include a local AI model. Reading a webpage may independently require internet access too.

### Can it answer something from the latest news
The current call has no enabled web-search tool. Do not assume it has checked current facts or even seen the full page. Use authoritative sources for time-sensitive questions. Selecting a news passage supplies that passage as context, not a live verification service.

### Can it answer any programming question perfectly
No. The prompt requests working code, but the model can misunderstand the task, miss a constraint, or produce a bug. The backend does not compile or execute answers. A coding platform's required signature and language matter, so include them in the selection where possible.

### Why can the same input produce different wording
The application asks a generative model for a response rather than reading a fixed database answer. Model behavior, input context, preferences, and generation can change wording. The repository does not set a deterministic-response guarantee or cache all live answers.

### Could several people use one running backend
A deliberately shared server could serve several clients after deployment changes. The supplied setup binds to the owner's loopback address and has no user authentication or quotas. Colleagues should run their own copies rather than assume your local URL is a shared service.

## 23 A demonstration and explanation you can give
### A thirty second introduction
I built QuickClarify to help people understand text while reading in Chrome. You highlight a question, paragraph, or coding problem and press a shortcut. The extension sends that selection to a local Python FastAPI server. The server uses an OpenAI model to answer the question, explain the paragraph, or produce code. The response appears in a card on the same page. The API key stays in private backend configuration.

### A two minute technical explanation
The Chrome part uses JavaScript because it needs the browser's extension APIs. Its manifest declares the popup, permissions, and shortcut. The service worker receives the shortcut, reads the selection through an injected script, and opens a card. The card sends text, length, and custom instructions through the worker to our REST endpoint.

The Python backend validates those fields using Pydantic. In demo mode it returns prepared samples. In live mode it builds instructions for the selected task and calls the Responses API with AsyncOpenAI. It returns JSON, and the extension inserts the answer as text. Settings and recent popup answers are stored locally. The application has automated tests, but actual browser behavior and AI quality also need manual checks.

### A demonstration in a useful order
1. Start the backend and open /health to show that it is running.
2. Highlight a short paragraph and request an explanation.
3. Highlight the discount question and check that the answer is 190 rupees.
4. Highlight the perfect-square algorithm problem and check that code is included.
5. Change the length to show that supporting detail changes.
6. Open the popup settings and show how a language preference is saved.

Use non-sensitive examples. Explain whether the demo is using prepared samples or live generation before demonstrating. Never display the API key as part of a presentation.

### A precise answer when asked what you built
Say that you built the extension interface, browser event and messaging workflow, Python API, validation, prompt behavior, local settings, documentation, and tests. Say that OpenAI supplies the underlying model. Avoid claiming that the project trains a model, guarantees every answer, works on every website, or is already a production hosted service.

## 24 A request shown in JavaScript and Python
### The JavaScript side
This illustrative excerpt runs inside the extension context. It is not a complete replacement for the repository files. The model key is absent because JavaScript asks the worker to contact the Python backend.

```javascript
const response = await chrome.runtime.sendMessage({
  type: 'EXPLAIN',
  payload: {
    text: 'What is an API?',
    length: 'standard',
    prompt: 'Use an everyday example.'
  }
});
```

const names a variable. await waits for the asynchronous reply. chrome.runtime.sendMessage sends an internal extension message, not the final OpenAI request. Braces group the fields; payload holds the request content. The worker recognizes EXPLAIN and makes the HTTP request. Its reply contains ok and either data or error. In a successful reply, response.data.explanation holds the answer.

### The Python side
Inside the live backend route, a simplified view of the existing SDK call is shown below. The client, model, instructions, and selected_text variables must already be defined; this excerpt illustrates the boundary rather than providing a standalone script.

```python
response = await client.responses.create(
    model=model,
    instructions=instructions,
    input=selected_text,
    max_output_tokens=1800,
    store=False,
)
answer = response.output_text
```

The real route constructs instructions from the tutor rules, requested length, and saved preference. It wraps the selection as user input, checks that the generated response completed, and returns an Explanation object. FastAPI serializes that object as JSON for the worker.

### Why the two response variables are different
Each snippet has its own local variable named response. JavaScript receives the worker's message reply. Python receives the SDK's model response. Reusing the same common variable name does not mean they share an object or memory. The programs exchange serialized messages across explicit boundaries.

Changing the display belongs in JavaScript. Changing the model's task instructions belongs in Python. Understanding that division makes the project much easier to debug.

## 25 Glossary sources and further reading
### A compact glossary
| Term | Meaning in this project |
| Backend | Python program receiving and processing API requests |
| Content script | Extension JavaScript running in a page context |
| Endpoint | A server route and method, such as POST /api/explain |
| Event | Something Chrome reports, such as a shortcut invocation |
| Frontend | Interface and browser behavior the user interacts with |
| JSON | Structured text used for request and response bodies |
| Loopback | A network address that points to the same computer |
| Model | AI system that generates the live response |
| Prompt | Instructions and content supplied to the model |
| Service worker | Event-driven coordinator inside the extension |
| Token | Model text unit used in generation limits and usage accounting |
| Virtual environment | Isolated Python dependency environment for this project |

### Project sources
The implementation details in this guide come from backend/main.py, extension/manifest.json, background.js, selection.js, content.js, popup.js, the popup HTML and CSS, tests/test_api.py, tests/test_extension.cjs, requirements.txt, .gitignore, and the CI workflow in the repository. The public README and SECURITY.md provide the installation and security guidance.

[QuickClarify repository and source code](https://github.com/tvivekanandareddy/QuickClarify---AI-Powered-Chrome-Extension)

### Official technical references
[Chrome activeTab permissions](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
[Chrome keyboard commands](https://developer.chrome.com/docs/extensions/reference/api/commands)
[FastAPI request bodies and validation](https://fastapi.tiangolo.com/tutorial/body/)
[OpenAI Responses API guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses)
[MDN explanation of Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
