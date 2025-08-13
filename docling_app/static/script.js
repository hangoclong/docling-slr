document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const viewerPlaceholder = document.getElementById('viewer-placeholder');
    const mainContent = document.getElementById('main-content');
    const pdfViewer = document.getElementById('pdf-viewer');
    const markdownViewer = document.getElementById('markdown-viewer');
    const renderToggle = document.getElementById('render-toggle');
    const saveButton = document.getElementById('save-button');
    const loadingOverlay = document.getElementById('loading-overlay');
    const logOutput = document.getElementById('log-output');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const downloadChunkButton = document.getElementById('download-chunk-button');

    // Container elements
    const pdfContainer = document.getElementById('pdf-container');
    const markdownContainer = document.getElementById('markdown-container');

    // --- On-Screen Logger ---
    function log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;
        console.info(message);
    }

    function logError(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'text-red-500 font-semibold';
        logEntry.textContent = `[${timestamp}] ERROR: ${message}`;
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;
        console.error(message);
    }

    // --- State ---
    let uploadedFiles = {};
    let activeFileId = null;
    let pollIntervals = {};
    const showdownConverter = new showdown.Converter();

    // --- Event Listeners ---
    uploadBox.addEventListener('click', () => fileInput.click());
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('border-blue-500', 'bg-blue-50');
    });
    uploadBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('border-blue-500', 'bg-blue-50');
    });
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        log('Drop event triggered.');
        uploadBox.classList.remove('border-blue-500', 'bg-blue-50');
        handleFileUpload(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
        log('File input change event triggered.');
        handleFileUpload(e.target.files);
    });

    renderToggle.addEventListener('change', () => {
        if (activeFileId && uploadedFiles[activeFileId]?.markdown) {
            renderMarkdown(uploadedFiles[activeFileId].markdown);
        }
    });

    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = fileList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        updateDownloadButtonState();
    });

    downloadChunkButton.addEventListener('click', async () => {
        const selectedIds = Array.from(fileList.querySelectorAll('input[type="checkbox"]:checked'))
                                 .map(cb => cb.value);

        if (selectedIds.length === 0) {
            logError('No files selected for download.');
            return;
        }

        log(`Requesting download for ${selectedIds.length} file(s).`);
        showLoading(true);

        try {
            const response = await fetch('/download-chunk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file_ids: selectedIds }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `docling_chunk_${new Date().toISOString().split('T')[0]}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            log('Chunk download successful.');

        } catch (error) {
            logError(`Failed to download chunk: ${error.message}`);
        } finally {
            showLoading(false);
        }
    });

    saveButton.addEventListener('click', () => {
        if (!activeFileId || !uploadedFiles[activeFileId]?.markdown) return;
        const blob = new Blob([uploadedFiles[activeFileId].markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = uploadedFiles[activeFileId].name.replace('.pdf', '.md');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // No tab switching needed for side-by-side layout

    // --- Core Functions ---
    function handleFileUpload(files) {
        log(`handleFileUpload called with ${files.length} file(s).`);
        const formData = new FormData();
        const newFiles = Array.from(files).filter(file => file.type === 'application/pdf');
        log(`Found ${newFiles.length} PDF file(s).`);

        if (newFiles.length === 0) {
            log('No PDF files found, aborting.');
            return;
        }

        showLoading(true);

        newFiles.forEach(file => {
            formData.append('files', file);
        });

        log('Sending files to server...');
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(uploadedFilesData => {
            log(`Server processed ${uploadedFilesData.length} file(s).`);
            uploadedFilesData.forEach(file => {
                const blob = findFileBlob(newFiles, file.name);
                if (blob) {
                    uploadedFiles[file.id] = { ...file, blob };
                    startConversion(file.id);
                }
            });
            updateFileList();
        })
        .catch(error => {
            logError(`Upload failed: ${error.message}`);
        })
        .finally(() => {
            showLoading(false);
        });
    }

    function startConversion(fileId) {
        log(`Starting conversion for ${fileId}`);
        fetch(`/convert/${fileId}`, { method: 'POST' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                log(`Conversion started: ${JSON.stringify(data)}`);
                // The server returns {"message": "Conversion started for file_id"}, not {"file_id": "..."}
                pollFileStatus(fileId);
            })
            .catch(error => {
                logError(`Error starting conversion for ${fileId}: ${error.message}`);
            });
    }

    function pollFileStatus(fileId) {
        if (pollIntervals[fileId]) {
            clearInterval(pollIntervals[fileId]);
        }

        log(`Starting polling for file ${fileId}`);
        
        // Immediately poll once to get initial status
        updateFileStatus(fileId);
        
        pollIntervals[fileId] = setInterval(() => {
            updateFileStatus(fileId);
        }, 2000);
    }
    
    function updateFileStatus(fileId) {
        log(`Checking status for file ${fileId}`);
        fetch(`/status/${fileId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                log(`Status update for ${fileId}: ${data.status}`);
                const file = uploadedFiles[fileId];
                if (!file) return;

                const statusChanged = file.status !== data.status;
                file.status = data.status;
                file.started_at = data.started_at;
                file.completed_at = data.completed_at;

                // Always update the file list to refresh timers
                updateFileList();

                if (data.status === 'completed' || data.status === 'failed') {
                    log(`File ${fileId} ${data.status}. Stopping polling.`);
                    clearInterval(pollIntervals[fileId]);
                    delete pollIntervals[fileId];
                    if (fileId === activeFileId) {
                        log(`Loading markdown for completed file ${fileId}`);
                        viewFile(fileId, true);
                    }
                }
            })
            .catch(error => {
                logError(`Error polling status for ${fileId}: ${error.message}`);
                clearInterval(pollIntervals[fileId]);
                delete pollIntervals[fileId];
            });
    }

    // --- UI Update Functions ---
    function updateFileList() {
        fileList.innerHTML = '';
        const sortedFiles = Object.values(uploadedFiles).sort((a, b) => a.name.localeCompare(b.name));

        sortedFiles.forEach(file => {
            const li = document.createElement('li');
            li.className = 'p-2 rounded-md flex items-center transition-colors';
            li.dataset.fileId = file.id;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = file.id;
            checkbox.className = 'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3 flex-shrink-0';
            checkbox.addEventListener('change', updateDownloadButtonState);
            li.appendChild(checkbox);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'flex-1 flex justify-between items-center cursor-pointer min-w-0';
            contentDiv.addEventListener('click', () => viewFile(file.id));

            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'flex-1 flex flex-col min-w-0';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'font-medium text-gray-800 truncate';
            nameSpan.textContent = file.name;
            detailsDiv.appendChild(nameSpan);

            const statusContainer = document.createElement('div');
            statusContainer.className = 'text-xs text-gray-500 flex items-center';
            
            const statusText = document.createElement('span');
            statusText.textContent = file.status.charAt(0).toUpperCase() + file.status.slice(1);
            statusContainer.appendChild(statusText);

            const timerContainer = document.createElement('span');
            timerContainer.className = 'timer-container ml-2';
            statusContainer.appendChild(timerContainer);
            
            detailsDiv.appendChild(statusContainer);
            contentDiv.appendChild(detailsDiv);

            if (file.status === 'queued') {
                const convertButton = document.createElement('button');
                convertButton.textContent = 'Convert';
                convertButton.className = 'ml-2 px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600';
                convertButton.onclick = (e) => {
                    e.stopPropagation();
                    startConversion(file.id);
                };
                contentDiv.appendChild(convertButton);
            }
            
            li.appendChild(contentDiv);

            if (file.id === activeFileId) {
                li.classList.add('bg-blue-50');
            } else {
                li.classList.add('hover:bg-gray-50');
            }

            fileList.appendChild(li);
        });

        updateDownloadButtonState();
    }

    function updateTimers() {
        Object.values(uploadedFiles).forEach(file => {
            if (file.status === 'processing' && file.started_at) {
                const li = fileList.querySelector(`[data-file-id="${file.id}"]`);
                if (li) {
                    const timerContainer = li.querySelector('.timer-container');
                    if (timerContainer) {
                        const elapsed = Math.round((new Date() - new Date(file.started_at)) / 1000);
                        timerContainer.textContent = `Processing... (${elapsed}s)`;
                    }
                }
            }
        });
    }
    setInterval(updateTimers, 1000);

    function updateDownloadButtonState() {
        const selectedCount = fileList.querySelectorAll('input[type="checkbox"]:checked').length;
        downloadChunkButton.disabled = selectedCount === 0;

        const totalCheckboxes = fileList.querySelectorAll('input[type="checkbox"]').length;
        selectAllCheckbox.checked = totalCheckboxes > 0 && selectedCount === totalCheckboxes;
    }

    async function viewFile(fileId, forceRender = false) {
        const fileData = uploadedFiles[fileId];
        if (!fileData) return;

        log(`Viewing file ${fileId}, status: ${fileData.status}, forceRender: ${forceRender}`);
        activeFileId = fileId;
        updateFileList();

        viewerPlaceholder.classList.add('hidden');
        mainContent.classList.remove('hidden');

        // Display PDF securely from the backend endpoint
        pdfViewer.innerHTML = ''; // Clear previous content
        const iframe = document.createElement('iframe');
        iframe.src = `/pdf/${fileId}`; // Use the secure backend endpoint
        iframe.className = 'w-full h-full'; // Fit the container
        pdfViewer.appendChild(iframe);

        // Handle Markdown content
        if (fileData.status === 'completed') {
            log(`Loading markdown for completed file ${fileId}`);
            try {
                // Always fetch fresh content when the file is completed
                const response = await fetch(`/result/${fileId}`);
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                log(`Received markdown content for ${fileId}`);
                
                if (data.content) {
                    fileData.markdown = data.content;
                    log(`Markdown content loaded successfully, length: ${fileData.markdown.length} chars`);
                } else {
                    logError(`No content in response for ${fileId}`);
                    fileData.markdown = 'Error: No content returned from server.';
                }
            } catch (error) {
                logError(`Error fetching markdown: ${error.message}`);
                fileData.markdown = `Error loading Markdown content: ${error.message}`;
            }
            renderMarkdown(fileData.markdown);
        } else {
            log(`File ${fileId} not completed yet, status: ${fileData.status}`);
            renderMarkdown(`*Conversion status: ${fileData.status}...*`);
        }
    }

    function renderMarkdown(content) {
        log(`Rendering markdown, rendered mode: ${renderToggle.checked}`);
        
        // Clear the viewer first
        markdownViewer.innerHTML = '';
        
        // Create a wrapper div to ensure proper scrolling
        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-content';
        
        if (renderToggle.checked) {
            wrapper.innerHTML = showdownConverter.makeHtml(content);
        } else {
            wrapper.textContent = content;
        }
        
        // Append the wrapper to the viewer
        markdownViewer.appendChild(wrapper);
        
        // The new flexbox layout handles visibility and scrolling automatically.
        log('Markdown rendered.');
    }

    // --- Utility Functions ---
    function findFileBlob(fileList, fileName) {
        for (const file of fileList) {
            if (file.name === fileName) return file;
        }
        return null;
    }

    function showLoading(isLoading) {
        loadingOverlay.classList.toggle('hidden', !isLoading);
    }
});
