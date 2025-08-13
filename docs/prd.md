# SLR Paper-to-Markdown Converter Product Requirements Document (PRD)

## Goals and Background Context

### Goals

*   Create a valuable, open-source tool that becomes an essential part of the SLR toolkit for researchers.
*   Foster a community of academic users and contributors to guide the tool's development and improve its accuracy.
*   Improve the quality and accuracy of extracted text and metadata from research papers.
*   Ensure the suitability of the generated Markdown for processing by LLMs.
*   Save researchers time in the data extraction phase of the SLR process.

### Background Context

Researchers conducting Systematic Literature Reviews (SLRs) need an efficient and reliable method to extract the full text and key metadata from a large number of research papers. Manual copy-pasting is time-consuming, error-prone, and results in unstructured text that is not ideal for computational analysis. This project aims to solve this problem by creating a desktop application that converts research papers into structured Markdown, optimized for analysis by Large Language Models (LLMs). The application will feature a two-panel UI for viewing the original paper and the rendered Markdown, and will support batch processing.

### Change Log

| Date       | Version | Description   | Author    |
| :--------- | :------ | :------------ | :-------- |
| 2025-08-13 | 1.0     | Initial draft | John (PM) |

## Requirements

### Functional

1.  **FR1:** The system shall allow users to upload one or more PDF files.
2.  **FR2:** The system shall convert the uploaded PDF files into structured Markdown.
3.  **FR3:** The system shall extract metadata (title, authors, abstract) from the PDF and include it in the Markdown output.
4.  **FR4:** The system shall display the original PDF and the rendered Markdown in a side-by-side view.
5.  **FR5:** The system shall allow users to save the generated Markdown to a `.md` file.
6.  **FR6:** The system shall provide a file list to manage and track the status of batch-processed files.

### Non-Functional

1.  **NFR1:** The application shall be cross-platform (Windows, macOS, Linux).
2.  **NFR2:** The application shall have a user-friendly and intuitive graphical user interface.
3.  **NFR3:** The application should be open-source, licensed under a permissive license (e.g., MIT).
4.  **NFR4:** The Markdown output should be structured in a way that is easily parsable by Large Language Models.

## User Interface Design Goals

### Overall UX Vision

The application should be simple, intuitive, and focused on the primary task of converting papers to Markdown. The web interface should be clean and academic-friendly, avoiding unnecessary clutter. The core of the experience is the side-by-side view, which should be easy to navigate and compare.

### Key Interaction Paradigms

*   **Drag-and-drop:** Users should be able to drag and drop PDF files into the web interface.
*   **File list:** A clear list of uploaded files with their conversion status.
*   **Side-by-side synchronized scrolling (optional but desirable):** As the user scrolls through the Markdown, the PDF view could scroll to the corresponding position.

### Core Screens and Views

*   **Main Page:** This will contain the file upload area, the file list, the side-by-side PDF and Markdown views, and controls for saving files.

### Accessibility: WCAG AA

The application should be usable by people with disabilities.

### Branding

Minimalist and professional.

### Target Device and Platforms: Web Responsive

The application will be a web app accessible from any modern browser.

## Technical Assumptions

### Repository Structure: Monorepo

For the initial phase of the project, a monorepo that contains both the frontend and backend code will be used. This will simplify development, dependency management, and local deployment.

### Service Architecture

The application will use a client-server architecture.

*   **Backend:** A Python web application using FastAPI will serve as the backend. It will expose a RESTful API for all application functionalities, including file upload, conversion, and status tracking.
*   **Frontend:** A web-based user interface will communicate with the backend via the API. The initial frontend will be built with vanilla HTML, CSS, and JavaScript to ensure rapid development.
*   **API-First Approach:** This architecture is intentionally designed to be API-first. This decouples the frontend from the backend, allowing for future flexibility. For example, the initial web UI could be simple HTML/CSS/JS, and it could be replaced with a more advanced framework like Next.js in the future without changing the backend.

### Testing Requirements

The backend API should have a suite of unit and integration tests to ensure its correctness and reliability.

### Additional Technical Assumptions and Requests

*   **Deployment:** The application will be designed to run locally for now, but the architecture should be suitable for future deployment to a cloud environment.
*   **Processing:** All file conversion and processing will be handled on the server-side (in the Python backend).
*   **API Documentation:** The API should be well-documented, for example, using the OpenAPI standard (Swagger).

## Epic List

*   **Epic 1: Foundation & Core Conversion API:** Establish the project setup, including the FastAPI backend and a basic frontend, and implement the core PDF-to-Markdown conversion functionality, exposed via an API endpoint.
*   **Epic 2: Frontend UI & Side-by-Side View:** Develop the web-based user interface, including the file upload mechanism and the side-by-side view for comparing the original PDF and the converted Markdown.
*   **Epic 3: Batch Processing & File Management:** Implement the ability to upload and manage a list of files, track their conversion status, and handle the batch processing workflow.

## Epic 1: Foundation & Core Conversion API

**Goal:** The goal of this epic is to establish the foundational infrastructure for the project and to implement the core functionality: converting a single PDF file to Markdown. This will result in a working backend API that can be tested and a minimal frontend for interacting with it.

### Story 1.1: Project Setup

*   **As a** developer,
*   **I want** to set up the project structure with a monorepo, including a directory for the FastAPI backend and a directory for the frontend,
*   **so that** we have a clean and organized codebase.

**Acceptance Criteria:**

1.  A Git repository is initialized.
2.  The repository contains a `backend` directory for the FastAPI application and a `frontend` directory for the web UI.
3.  A `README.md` file is created with basic instructions for setting up and running the project.

### Story 1.2: FastAPI Backend Setup

*   **As a** developer,
*   **I want** to create a basic FastAPI application with a health check endpoint,
*   **so that** we have a running backend server to build upon.

**Acceptance Criteria:**

1.  A `main.py` file is created in the `backend` directory with a basic FastAPI application.
2.  The application has a `/health` endpoint that returns a `200 OK` response with a JSON body like `{"status": "ok"}`.
3.  The backend can be started with `uvicorn`.

### Story 1.3: Core PDF-to-Markdown Conversion Logic

*   **As a** developer,
*   **I want** to create a Python module that takes a PDF file as input and returns its content as a Markdown string,
*   **so that** we have the core conversion functionality.

**Acceptance Criteria:**

1.  A Python function is created that accepts a file path to a PDF.
2.  The function reads the PDF and converts its text content into a Markdown string.
3.  The function can handle basic text extraction from a simple, single-column PDF.

### Story 1.4: File Upload API Endpoint

*   **As a** developer,
*   **I want** to create a FastAPI endpoint that accepts a PDF file upload,
*   **so that** the frontend can send files to the backend for processing.

**Acceptance Criteria:**

1.  A `/upload` endpoint is created that accepts a `POST` request with a file upload.
2.  The endpoint saves the uploaded file to a temporary directory on the server.
3.  The endpoint returns a unique identifier for the uploaded file.

### Story 1.5: Conversion API Endpoint

*   **As a** developer,
*   **I want** to create a FastAPI endpoint that takes an uploaded file, uses the conversion logic from Story 1.3 to convert it to Markdown, and returns the Markdown content,
*   **so that** the frontend can retrieve the converted text.

**Acceptance Criteria:**

1.  A `/convert/{file_id}` endpoint is created that accepts a `GET` request.
2.  The endpoint uses the file identifier to find the uploaded file.
3.  The endpoint uses the conversion module to convert the file to Markdown.
4.  The endpoint returns the Markdown text in the response body.

### Story 1.6: Basic Frontend for Uploading

*   **As a** user,
*   **I want** a basic web page with a file input that allows me to upload a PDF file and see the returned Markdown text,
*   **so that** I can test the core functionality of the application.

**Acceptance Criteria:**

1.  A basic `index.html` file is created in the `frontend` directory.
2.  The page contains a file input and an "Upload" button.
3.  When a file is selected and the button is clicked, the file is sent to the `/upload` endpoint.
4.  After a successful upload, the frontend calls the `/convert` endpoint and displays the returned Markdown text on the page.

## Epic 2: Frontend UI & Side-by-Side View

**Goal:** The goal of this epic is to build out the main user interface of the application. This includes creating a more polished frontend, implementing the side-by-side view for comparing the PDF and the Markdown, and improving the overall user experience of the file upload and conversion process.

### Story 2.1: Structured Frontend Setup

*   **As a** developer,
*   **I want** to structure the frontend code using vanilla JavaScript modules and a simple bundler (like Parcel or esbuild),
*   **so that** we have a maintainable frontend without the overhead of a large framework.

**Acceptance Criteria:**

1.  The `frontend` directory is set up with a simple build process for JavaScript and CSS.
2.  The code is organized into modules.
3.  The basic frontend from Epic 1 is migrated to this new structure.

### Story 2.2: PDF Rendering in the UI

*   **As a** user,
*   **I want** to see the uploaded PDF rendered in one panel of the UI,
*   **so that** I can compare it with the converted Markdown.

**Acceptance Criteria:**

1.  A PDF rendering library (e.g., PDF.js) is integrated into the frontend.
2.  After a file is uploaded, the PDF is rendered in a designated area of the UI.
3.  The user can scroll through the pages of the PDF.

### Story 2.3: Markdown Rendering in the UI

*   **As a** user,
*   **I want** to see the converted Markdown rendered as formatted text in the other panel of the UI,
*   **so that** I can easily read and verify it.

**Acceptance Criteria:**

1.  A Markdown rendering library (e.g., Marked.js or a similar library) is integrated into the frontend.
2.  The Markdown received from the backend is rendered as HTML in a designated area of the UI.
3.  The rendered Markdown should reflect basic formatting like headers, lists, and bold/italic text.

### Story 2.4: Side-by-Side View Layout

*   **As a** developer,
*   **I want** to create a two-panel layout that displays the PDF renderer and the Markdown renderer side-by-side,
*   **so that** the user can easily compare the two.

**Acceptance Criteria:**

1.  The main view of the application is divided into two vertical panels.
2.  The left panel displays the rendered PDF.
3.  The right panel displays the rendered Markdown.
4.  The panels should be resizable.

### Story 2.5: Improved File Upload UX

*   **As a** user,
*   **I want** a more user-friendly file upload experience, with features like drag-and-drop and clear feedback on the upload progress,
*   **so that** the application is easier and more pleasant to use.

**Acceptance Criteria:**

1.  Users can drag and drop a PDF file onto a designated area of the page to upload it.
2.  A visual indicator (e.g., a progress bar) is displayed during the file upload and conversion process.
3.  Clear error messages are displayed if the upload or conversion fails.

## Epic 3: Batch Processing & File Management

**Goal:** The goal of this epic is to implement the batch processing functionality, which is a core requirement for the SLR workflow. This includes allowing users to upload multiple files, view them in a list, track their conversion status, and manage the output.

### Story 3.1: Multiple File Upload

*   **As a** user,
*   **I want** to be able to select and upload multiple PDF files at once,
*   **so that** I can efficiently process a large number of papers.

**Acceptance Criteria:**

1.  The file input allows the selection of multiple files.
2.  The drag-and-drop functionality supports dropping multiple files.
3.  The backend API is updated to handle multiple file uploads in a single request.

### Story 3.2: File List View

*   **As a** user,
*   **I want** to see a list of all the files I've uploaded in the current session, along with their conversion status (e.g., "Pending," "Converting," "Complete," "Error"),
*   **so that** I can track the progress of my batch job.

**Acceptance Criteria:**

1.  A file list is displayed in the UI.
2.  Each item in the list shows the filename and its current conversion status.
3.  The status is updated in real-time as the files are processed by the backend.

### Story 3.3: Asynchronous Conversion

*   **As a** developer,
*   **I want** to implement an asynchronous task queue on the backend to handle the file conversions,
*   **so that** the application remains responsive while processing multiple files and to allow for future scalability.

**Acceptance Criteria:**

1.  A task queue (e.g., using Celery with Redis or RabbitMQ) is integrated into the backend.
2.  File conversion tasks are added to the queue and processed asynchronously by worker processes.
3.  The API provides endpoints for checking the status of a conversion task.

### Story 3.4: Selecting a File from the List

*   **As a** user,
*   **I want** to be able to click on a file in the list to view its side-by-side comparison,
*   **so that** I can review the results of the conversion for each file.

**Acceptance Criteria:**

1.  Clicking on a file in the list loads it into the side-by-side view.
2.  If the conversion is complete, the PDF and the rendered Markdown are displayed.
3.  If the conversion is in progress, a loading indicator is shown.
4.  If the conversion failed, an error message is displayed.

### Story 3.5: Saving All Converted Files

*   **As a** user,
*   **I want** a "Save All" button that allows me to download a zip file containing all the successfully converted Markdown files,
*   **so that** I can easily save the results of my batch job.

**Acceptance Criteria:**

1.  A "Save All" button is available in the UI.
2.  Clicking the button triggers a request to the backend to package all the converted Markdown files.
3.  The backend generates a zip file and the browser prompts the user to download it.
