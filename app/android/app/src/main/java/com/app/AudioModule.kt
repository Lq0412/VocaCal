package com.app

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaPlayer
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.io.DataOutputStream
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.concurrent.thread

class AudioModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var player: MediaPlayer? = null
    private var audioRecord: AudioRecord? = null
    private var isRecording: Boolean = false
    private var recordThread: Thread? = null
    private var pcmFile: File? = null

    // ── 流式播放 ──
    private var audioTrack: AudioTrack? = null
    private var isTrackPlaying: Boolean = false
    private val pcmQueue = ConcurrentLinkedQueue<ByteArray>()
    private var playThread: Thread? = null

    companion object {
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val EVENT_AUDIO_CHUNK = "AudioChunk"
        private const val CHUNK_SIZE = 2560  // 每次发送的 PCM 字节数，与讯飞 ASR 帧大小一致
    }

    override fun getName(): String = "AudioModule"

    // ════════════════════════════════════════════
    //  原有方法：文件录音 + URL 播放（保留不动）
    // ════════════════════════════════════════════

    @ReactMethod
    fun startRecording(promise: Promise) {
        try {
            stopAllRecording()
            val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
            audioRecord = AudioRecord(
                android.media.MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize * 2
            )
            pcmFile = File(reactContext.cacheDir, "vocalcal_record.wav")
            isRecording = true
            audioRecord?.startRecording()
            recordThread = Thread {
                val buffer = ShortArray(bufferSize)
                val fos = FileOutputStream(pcmFile!!)
                val dos = DataOutputStream(fos)
                // Write placeholder WAV header (will fix later)
                val header = ByteArray(44)
                dos.write(header)
                var totalBytes: Long = 0
                while (isRecording) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        val byteBuf = ByteArray(read * 2)
                        for (i in 0 until read) {
                            val v = buffer[i].toInt()
                            byteBuf[i * 2] = (v and 0xFF).toByte()
                            byteBuf[i * 2 + 1] = (v shr 8 and 0xFF).toByte()
                        }
                        dos.write(byteBuf)
                        totalBytes += read * 2L
                    }
                }
                dos.flush()
                dos.close()
                writeWavHeader(pcmFile!!, totalBytes)
            }
            recordThread?.start()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RECORD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            isRecording = false
            recordThread?.join(3000)
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            promise.resolve(pcmFile?.absolutePath ?: "")
        } catch (e: Exception) {
            promise.reject("STOP_RECORD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun playFromUrl(url: String, promise: Promise) {
        try {
            releasePlayer()
            val mp = MediaPlayer()
            mp.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            mp.setDataSource(url)
            mp.prepareAsync()
            mp.setOnPreparedListener { m ->
                m.start()
                promise.resolve(null)
            }
            mp.setOnErrorListener { _, what, _ ->
                promise.reject("PLAY_ERROR", "MediaPlayer error")
                true
            }
            player = mp
        } catch (e: Exception) {
            promise.reject("PLAY_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopPlayer(promise: Promise) {
        try {
            player?.let {
                it.stop()
                it.release()
            }
            player = null
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_PLAY_ERROR", e.message)
        }
    }

    // ════════════════════════════════════════════
    //  新方法：流式录音（PCM 块实时推送到 JS）
    // ════════════════════════════════════════════

    @ReactMethod
    fun startStreamingRecording(promise: Promise) {
        try {
            stopAllRecording()
            val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
            audioRecord = AudioRecord(
                android.media.MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize * 2
            )
            isRecording = true
            audioRecord?.startRecording()

            recordThread = Thread {
                val buffer = ShortArray(CHUNK_SIZE / 2) // CHUNK_SIZE bytes = CHUNK_SIZE/2 shorts
                while (isRecording) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (read > 0) {
                        // Short[] → ByteArray (little-endian PCM 16bit)
                        val byteBuf = ByteArray(read * 2)
                        for (i in 0 until read) {
                            val v = buffer[i].toInt()
                            byteBuf[i * 2] = (v and 0xFF).toByte()
                            byteBuf[i * 2 + 1] = (v shr 8 and 0xFF).toByte()
                        }
                        // 发送 base64 编码的 PCM 块给 JS 层
                        val b64 = Base64.encodeToString(byteBuf, Base64.NO_WRAP)
                        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit(EVENT_AUDIO_CHUNK, b64)
                    }
                }
            }
            recordThread?.start()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STREAM_RECORD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopStreamingRecording(promise: Promise) {
        try {
            isRecording = false
            recordThread?.join(3000)
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_STREAM_ERROR", e.message)
        }
    }

    // ════════════════════════════════════════════
    //  新方法：流式 PCM 播放（TTS 音频块）
    // ════════════════════════════════════════════

    @ReactMethod
    fun startPCMPlayback(promise: Promise) {
        try {
            stopPCMPlayback()
            val bufSize = AudioTrack.getMinBufferSize(
                SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(bufSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            audioTrack?.play()
            isTrackPlaying = true
            pcmQueue.clear()

            // 后台线程：从队列取 PCM 块写入 AudioTrack
            playThread = thread(start = true) {
                while (isTrackPlaying || pcmQueue.isNotEmpty()) {
                    val chunk = pcmQueue.poll()
                    if (chunk != null) {
                        audioTrack?.write(chunk, 0, chunk.size)
                    } else {
                        Thread.sleep(10)
                    }
                }
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PCM_PLAY_ERROR", e.message)
        }
    }

    @ReactMethod
    fun feedPCMChunk(base64Chunk: String, promise: Promise) {
        try {
            val pcm = Base64.decode(base64Chunk, Base64.NO_WRAP)
            pcmQueue.add(pcm)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("FEED_PCM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopPCMPlayback(promise: Promise) {
        stopPCMPlayback()
        promise.resolve(null)
    }

    // ════════════════════════════════════════════
    //  内部方法
    // ════════════════════════════════════════════

    private fun stopAllRecording() {
        isRecording = false
        try { recordThread?.join(1000) } catch (_: Exception) {}
        try { audioRecord?.stop() } catch (_: Exception) {}
        try { audioRecord?.release() } catch (_: Exception) {}
        audioRecord = null
    }

    private fun releasePlayer() {
        player?.release()
        player = null
    }

    private fun stopPCMPlayback() {
        isTrackPlaying = false
        try { playThread?.join(2000) } catch (_: Exception) {}
        try { audioTrack?.stop() } catch (_: Exception) {}
        try { audioTrack?.release() } catch (_: Exception) {}
        audioTrack = null
        pcmQueue.clear()
    }

    private fun writeWavHeader(file: File, dataLength: Long) {
        val raf = RandomAccessFile(file, "rw")
        raf.seek(0)
        // Write header byte by byte to avoid ByteBuffer issues
        val out = java.io.ByteArrayOutputStream(44)
        // RIFF
        out.write(intArrayOf(0x52, 0x49, 0x46, 0x46).map { it.toByte() }.toByteArray())
        // File size - 8
        val fileSize = (36 + dataLength).toInt()
        out.write(byteArrayOf(
            (fileSize and 0xFF).toByte(),
            (fileSize shr 8 and 0xFF).toByte(),
            (fileSize shr 16 and 0xFF).toByte(),
            (fileSize shr 24 and 0xFF).toByte()
        ))
        // WAVE
        out.write(intArrayOf(0x57, 0x41, 0x56, 0x45).map { it.toByte() }.toByteArray())
        // fmt 
        out.write(intArrayOf(0x66, 0x6D, 0x74, 0x20).map { it.toByte() }.toByteArray())
        // Subchunk1 size = 16
        out.write(byteArrayOf(16, 0, 0, 0))
        // Audio format = 1 (PCM)
        out.write(byteArrayOf(1, 0))
        // Num channels = 1
        out.write(byteArrayOf(1, 0))
        // Sample rate = 16000 = 0x3E80
        val sr = SAMPLE_RATE
        out.write(byteArrayOf(
            (sr and 0xFF).toByte(),
            (sr shr 8 and 0xFF).toByte(),
            (sr shr 16 and 0xFF).toByte(),
            (sr shr 24 and 0xFF).toByte()
        ))
        // Byte rate = 32000 = 0x7D00
        val br = SAMPLE_RATE * 2
        out.write(byteArrayOf(
            (br and 0xFF).toByte(),
            (br shr 8 and 0xFF).toByte(),
            (br shr 16 and 0xFF).toByte(),
            (br shr 24 and 0xFF).toByte()
        ))
        // Block align = 2
        out.write(byteArrayOf(2, 0))
        // Bits per sample = 16
        out.write(byteArrayOf(16, 0))
        // data
        out.write(intArrayOf(0x64, 0x61, 0x74, 0x61).map { it.toByte() }.toByteArray())
        // Data size
        val ds = dataLength.toInt()
        out.write(byteArrayOf(
            (ds and 0xFF).toByte(),
            (ds shr 8 and 0xFF).toByte(),
            (ds shr 16 and 0xFF).toByte(),
            (ds shr 24 and 0xFF).toByte()
        ))
        raf.write(out.toByteArray())
        raf.close()
    }
}
