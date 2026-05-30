package com.app

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaPlayer
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.io.DataOutputStream

class AudioModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var player: MediaPlayer? = null
    private var audioRecord: AudioRecord? = null
    private var isRecording: Boolean = false
    private var recordThread: Thread? = null
    private var pcmFile: File? = null

    companion object {
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    override fun getName(): String = "AudioModule"

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
