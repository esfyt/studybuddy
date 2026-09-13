// ========================================
// STUDY BUDDY — VOICE INPUT (shared)
// Speech recognition (en-IN) for answer boxes.
// Loaded right after core.js on pages that need voice.
// ========================================

let recognition = null;

function stopVoiceRecognition() {
    if (recognition) {
        try { recognition.stop(); } catch (e) { /* already stopped */ }
        recognition = null;
    }
}

function startVoice(inputId, buttonId) {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showToast("Voice is not supported in this browser. Try Google Chrome! 🎙️", "error", "🌐");
        return;
    }

    // If recording, stop it
    if (recognition) {
        stopVoiceRecognition();
        const btn = $(buttonId);
        if (btn) btn.textContent = "🎙️ Speak";
        return;
    }

    const input = $(inputId);
    const voiceButton = $(buttonId);
    if (!input || !voiceButton) return;

    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        voiceButton.textContent = "⏹️ Tap to stop";
        voiceButton.classList.add("recording");
        voiceButton.insertAdjacentHTML("beforeend",
            '<span class="eq"><span></span><span></span><span></span><span></span></span>');
    };

    recognition.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += transcript;
            else interim += transcript;
        }
        input.value = final || interim;
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "aborted" && event.error !== "no-speech") {
            showToast("Buddy couldn't hear any sound. Try again! 🎙️", "error", "🙉");
        }
    };

    recognition.onend = () => {
        recognition = null;
        voiceButton.textContent = "🎙️ Speak";
        voiceButton.classList.remove("recording");
        const eq = voiceButton.querySelector(".eq");
        if (eq) eq.remove();
    };

    try {
        recognition.start();
    } catch (e) {
        recognition = null;
    }
}

window.startVoice = startVoice;
window.stopVoiceRecognition = stopVoiceRecognition;