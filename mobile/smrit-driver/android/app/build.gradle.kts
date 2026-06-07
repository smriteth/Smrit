import org.gradle.api.GradleException
import java.util.Base64

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

fun releaseTaskRequested(): Boolean =
    gradle.startParameter.taskNames.any { it.lowercase().contains("release") }

fun requiredEnv(name: String): String {
    val value = System.getenv(name)
    if (releaseTaskRequested() && value.isNullOrBlank()) {
        throw GradleException("$name is required for SMRIT Android release builds")
    }
    return value.orEmpty()
}

fun decodedDartDefines(): Map<String, String> {
    val encoded = (project.findProperty("dart-defines") as String?).orEmpty()
    if (encoded.isBlank()) return emptyMap()

    return encoded.split(',')
        .filter { it.isNotBlank() }
        .mapNotNull { item ->
            val decoded = String(Base64.getDecoder().decode(item))
            val separator = decoded.indexOf('=')
            if (separator == -1) null else decoded.substring(0, separator) to decoded.substring(separator + 1)
        }
        .toMap()
}

fun requireHttpsDartDefine(name: String, defines: Map<String, String>) {
    val value = defines[name]
    if (value.isNullOrBlank()) {
        throw GradleException("$name must be provided with --dart-define for SMRIT Android release builds")
    }
    if (!value.startsWith("https://")) {
        throw GradleException("$name must use HTTPS for SMRIT Android release builds")
    }
    if (Regex("localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|10\\.0\\.2\\.2", RegexOption.IGNORE_CASE).containsMatchIn(value)) {
        throw GradleException("$name must not point at localhost for SMRIT Android release builds")
    }
}

if (releaseTaskRequested()) {
    val defines = decodedDartDefines()
    requireHttpsDartDefine("API_BASE_URL", defines)
    requireHttpsDartDefine("GPS_BASE_URL", defines)
}

val releaseKeystorePath = requiredEnv("SMRIT_ANDROID_KEYSTORE_PATH")
val releaseKeystorePassword = requiredEnv("SMRIT_ANDROID_KEYSTORE_PASSWORD")
val releaseKeyAlias = requiredEnv("SMRIT_ANDROID_KEY_ALIAS")
val releaseKeyPassword = requiredEnv("SMRIT_ANDROID_KEY_PASSWORD")

android {
    namespace = "et.smrit.driver"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "et.smrit.driver"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (releaseKeystorePath.isNotBlank()) {
                storeFile = file(releaseKeystorePath)
                storePassword = releaseKeystorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

flutter {
    source = "../.."
}
