package com.navia.academy.widgets

import android.content.Context

/** One snapshot, read by every widget. Defaults mean "nothing to say", not a crash. */
data class WidgetSnapshot(
    val streak: Int = 0,
    val bestStreak: Int = 0,
    val studiedToday: Boolean = false,
    val due: Int? = null,
    val minutesToday: Int = 0,
    val dailyGoalMinutes: Int = 20,
    val recent: List<Boolean> = List(7) { false },
    val updatedAt: Long = 0L,
    val background: String = "#0B0F1A",
    val foreground: String = "#F2F2F5",
    val accent: String = "#7BA05B",
    val muted: String = "#8A8A93",
    val themeId: String = "ink"
) {
    val goalProgress: Float
        get() = if (dailyGoalMinutes <= 0) 0f
        else (minutesToday.toFloat() / dailyGoalMinutes).coerceIn(0f, 1f)

    /** A streak in danger is one that is live and has not been touched today. */
    val atRisk: Boolean
        get() = streak > 0 && !studiedToday

    val mood: String
        get() = when {
            streak == 0 && !studiedToday -> "empty"
            studiedToday -> "celebrate"
            else -> "atRisk"
        }

    /** A milestone only matters on the day it is reached. */
    val milestone: Int?
        get() = listOf(365, 100, 30, 7).firstOrNull { streak > 0 && streak % it == 0 }
}

/** Where the app leaves the snapshot for the widget process to find. */
object WidgetStore {
    const val PREFS = "navia_widgets"
    const val KEY_PAYLOAD = "payload"

    fun read(context: Context): WidgetSnapshot {
        val raw = context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PAYLOAD, null)
            ?: return WidgetSnapshot()
        return parse(raw)
    }

    fun write(context: Context, json: String) {
        context
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PAYLOAD, json)
            .apply()
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }

    // Regex reader, not a JSON lib: the payload is written by sibling code and
    // holds only primitives. Every field falls back, so bad data still draws.
    internal fun parse(json: String): WidgetSnapshot {
        fun str(key: String, fallback: String): String =
            Regex("\"" + key + "\"\\s*:\\s*\"([^\"]*)\"")
                .find(json)?.groupValues?.get(1) ?: fallback

        // Read as Long, not Int: `updatedAt` is epoch milliseconds and overflows
        // a 32-bit int, so toIntOrNull would return null and silently reset it to
        // the fallback — the widget would just claim it had never been updated.
        fun num(key: String, fallback: Long): Long =
            Regex("\"" + key + "\"\\s*:\\s*(-?\\d+)").find(json)
                ?.groupValues?.get(1)?.toLongOrNull() ?: fallback

        fun count(key: String, fallback: Int = 0): Int = num(key, fallback.toLong()).toInt()

        fun bool(key: String, fallback: Boolean): Boolean =
            Regex("\"" + key + "\"\\s*:\\s*(true|false)").find(json)
                ?.groupValues?.get(1)?.toBoolean() ?: fallback

        fun nullableNum(key: String): Int? =
            Regex("\"" + key + "\"\\s*:\\s*(\\d+|null)").find(json)
                ?.groupValues?.get(1)
                ?.let { if (it == "null") null else it.toLongOrNull()?.toInt() }

        // The week strip, in order, oldest first. Absent entries count as false
        // so a truncated array draws short rather than throwing.
        val recent = Regex("\"recent\"\\s*:\\s*\\[([^\\]]*)\\]").find(json)
            ?.groupValues?.get(1)
            ?.let { body ->
                Regex("(true|false)").findAll(body).map { it.groupValues[1] == "true" }.toList()
            }
            ?: emptyList()

        return WidgetSnapshot(
            streak = count("streak").coerceAtLeast(0),
            bestStreak = count("bestStreak").coerceAtLeast(0),
            studiedToday = bool("studiedToday", false),
            due = nullableNum("due"),
            minutesToday = count("minutesToday").coerceAtLeast(0),
            dailyGoalMinutes = count("dailyGoalMinutes", 20).coerceAtLeast(1),
            recent = recent.take(7) + List((7 - recent.size).coerceAtLeast(0)) { false },
            updatedAt = num("updatedAt", 0L),
            background = str("background", "#0B0F1A"),
            foreground = str("foreground", "#F2F2F5"),
            accent = str("accent", "#7BA05B"),
            muted = str("muted", "#8A8A93"),
            themeId = str("themeId", "ink")
        )
    }
}
