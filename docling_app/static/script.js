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
    const downloadInChunksButton = document.getElementById('download-in-chunks-button');
    const chunkSizeInput = document.getElementById('chunk-size');
    const conversionModeSelect = document.getElementById('conversion-mode');

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
        uploadBox.classList.add('border-indigo-500', 'bg-indigo-100');
    });
    uploadBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('border-indigo-500', 'bg-indigo-100');
    });
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        log('Drop event triggered.');
        uploadBox.classList.remove('border-indigo-500', 'bg-indigo-100');
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

    downloadInChunksButton.addEventListener('click', async () => {
        const selectedIds = Array.from(fileList.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        if (selectedIds.length === 0) {
            logError('No files selected for download.');
            return;
        }

        const chunkSize = parseInt(chunkSizeInput.value, 10);
        if (isNaN(chunkSize) || chunkSize < 1) {
            logError('Invalid chunk size. Please enter a positive number.');
            return;
        }

        log(`Requesting chunked download for ${selectedIds.length} file(s) with chunk size ${chunkSize}.`);
        showLoading(true);

        try {
            // First, get the chunking information
            const chunkInfoResponse = await fetch('/download-chunked', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_ids: selectedIds,
                    chunk_size: chunkSize
                }),
            });

            if (!chunkInfoResponse.ok) {
                throw new Error(`Server error: ${chunkInfoResponse.statusText}`);
            }

            const chunkInfo = await chunkInfoResponse.json();
            log(`Files will be downloaded in ${chunkInfo.total_chunks} chunk(s).`);

            // Download each chunk sequentially
            for (let i = 0; i < chunkInfo.chunks.length; i++) {
                const chunk = chunkInfo.chunks[i];
                log(`Downloading chunk ${chunk.chunk_number} of ${chunkInfo.total_chunks} (${chunk.file_count} files)...`);

                const response = await fetch('/download-chunk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ file_ids: chunk.file_ids }),
                });

                if (!response.ok) {
                    throw new Error(`Server error downloading chunk ${chunk.chunk_number}: ${response.statusText}`);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                // Determine filename based on chunk size
                let filename;
                if (chunkSize === 1 && chunk.files && chunk.files.length === 1) {
                    // For single file chunks, use the original filename with numbering
                    const fileInfo = chunk.files[0];
                    const safeFilename = fileInfo.original_filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    filename = `${chunk.chunk_number}_${safeFilename}.md`;
                } else {
                    // For multi-file chunks, use the standard naming convention
                    filename = `docling_chunk_${chunk.chunk_number}_of_${chunkInfo.total_chunks}_${new Date().toISOString().split('T')[0]}.md`;
                }

                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Small delay between downloads to prevent browser issues
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            log('All chunks downloaded successfully.');
        } catch (error) {
            logError(`Chunked download failed: ${error.message}`);
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
                        // Store file but DON'T auto-convert - let user select mode first
                        uploadedFiles[file.id] = { ...file, blob, status: 'uploaded' };
                    }
                });
                updateFileList();
                log('Files uploaded. Select a mode and click Convert to process.');
            })
            .catch(error => {
                logError(`Upload failed: ${error.message}`);
            })
            .finally(() => {
                showLoading(false);
            });
    }

    function startConversion(fileId) {
        // Get the selected conversion mode from the dropdown
        const mode = conversionModeSelect ? conversionModeSelect.value : 'balanced';
        log(`Starting conversion for ${fileId} with mode: ${mode}`);

        fetch(`/convert/${fileId}?mode=${mode}`, { method: 'POST' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                log(`Conversion started: ${JSON.stringify(data)}`);
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

        // Update file count badge
        const fileCountBadge = document.getElementById('file-count');
        if (fileCountBadge) {
            fileCountBadge.textContent = `${sortedFiles.length} file${sortedFiles.length !== 1 ? 's' : ''}`;
        }

        sortedFiles.forEach(file => {
            const li = document.createElement('li');
            li.className = 'group p-3 rounded-xl flex items-center transition-all cursor-pointer border border-transparent';
            li.dataset.fileId = file.id;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = file.id;
            checkbox.className = 'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-3 flex-shrink-0 cursor-pointer';
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent li click
                updateDownloadButtonState();
            });
            li.appendChild(checkbox);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'flex-1 flex justify-between items-center min-w-0';
            contentDiv.addEventListener('click', () => viewFile(file.id));

            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'flex-1 flex flex-col min-w-0 mr-2';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'font-medium text-slate-700 truncate text-sm group-hover:text-indigo-700 transition-colors';
            nameSpan.textContent = file.name;
            detailsDiv.appendChild(nameSpan);

            const statusContainer = document.createElement('div');
            statusContainer.className = 'text-[10px] text-slate-400 flex items-center gap-1 mt-0.5';

            // Status Indicator Dot
            const statusDot = document.createElement('div');
            statusDot.className = 'h-1.5 w-1.5 rounded-full';

            if (file.status === 'completed') statusDot.classList.add('bg-emerald-500');
            else if (file.status === 'processing') statusDot.classList.add('bg-amber-400', 'animate-pulse');
            else if (file.status === 'failed') statusDot.classList.add('bg-red-500');
            else statusDot.classList.add('bg-slate-300');

            statusContainer.appendChild(statusDot);

            const statusText = document.createElement('span');
            statusText.textContent = file.status.charAt(0).toUpperCase() + file.status.slice(1);
            statusContainer.appendChild(statusText);

            const timerContainer = document.createElement('span');
            timerContainer.className = 'timer-container ml-1';
            statusContainer.appendChild(timerContainer);

            detailsDiv.appendChild(statusContainer);
            contentDiv.appendChild(detailsDiv);

            // Show Convert/Reconvert button for non-processing files
            if (file.status !== 'processing') {
                const convertButton = document.createElement('button');

                // Different icon/style based on status
                if (file.status === 'completed') {
                    // Reconvert icon (refresh)
                    convertButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>`;
                    convertButton.className = 'p-1.5 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors';
                    convertButton.title = 'Reconvert with current mode';
                } else {
                    // Convert icon (play)
                    convertButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
                    convertButton.className = 'p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors';
                    convertButton.title = 'Convert with selected mode';
                }

                convertButton.onclick = (e) => {
                    e.stopPropagation();
                    startConversion(file.id);
                };
                contentDiv.appendChild(convertButton);
            }

            li.appendChild(contentDiv);

            if (file.id === activeFileId) {
                li.classList.add('bg-indigo-50', 'border-indigo-200', 'shadow-sm');
                nameSpan.classList.add('text-indigo-700', 'font-semibold');
            } else {
                li.classList.add('hover:bg-slate-50', 'hover:border-slate-100');
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
                        timerContainer.textContent = `(${elapsed}s)`;
                    }
                }
            }
        });
    }
    setInterval(updateTimers, 1000);

    function updateDownloadButtonState() {
        const selectedCheckboxes = fileList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedCount = selectedCheckboxes.length;

        // Check if any selected files are completed
        let hasCompletedFiles = false;
        selectedCheckboxes.forEach(checkbox => {
            const fileId = checkbox.value;
            if (uploadedFiles[fileId] && uploadedFiles[fileId].status === 'completed') {
                hasCompletedFiles = true;
            }
        });

        // Enable download buttons only if there are completed files selected
        downloadChunkButton.disabled = selectedCount === 0 || !hasCompletedFiles;
        downloadInChunksButton.disabled = selectedCount === 0 || !hasCompletedFiles;

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
