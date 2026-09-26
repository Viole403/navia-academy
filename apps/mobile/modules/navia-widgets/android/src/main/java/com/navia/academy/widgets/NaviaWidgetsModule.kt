package com.navia.academy.widgets

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.runBlocking
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.ModuleDefinition

/** Hex string from the app to the ARGB int Glance wants, with a safe fallback. */
internal fun String.toArgbOr(fallback: Int): Int {
    val hex = removePrefix("#")
    return try {
        when (hex.length) {
            6 -> ("FF$hex").toLong(16).toInt()
            8 -> hex.toLong(16).toInt()
            else -> fallback
        }
    } catch (_: NumberFormatException) {
        fallback
    }
}

/**
 * The bridge from the app to the widgets.
 *
 * A widget is a different process with no access to this app's code, so the only
 * way it learns anything is a snapshot written somewhere both can read.
 * SharedPreferences holding one JSON string is that somewhere: it survives the
 * app being killed, needs no extra permission, and is readable synchronously
 * from the widget's own process when the launcher asks it to draw.
 */
class NaviaWidgetsModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("NaviaWidgets")

        // Availability is reported rather than thrown, because this module only
        // declares Android: an iOS build still installs and runs, it just has no
        // widgets, so shared code has to be able to ask first and carry on.
        AsyncFunction("isAvailable") { true }

        AsyncFunction("setPayload") { json: String ->
            val ctx: Context = appContext.reactContext ?: throw Exceptions.AppContextLost()
            WidgetStore.write(ctx, json)
            // Without this the home screen keeps drawing the previous snapshot
            // until the launcher happens to refresh on its own schedule, which
            // can be hours.
            runBlocking { WidgetRefresher.refreshAll(ctx) }
            true
        }

        AsyncFunction("clear") {
            val ctx: Context = appContext.reactContext ?: throw Exceptions.AppContextLost()
            WidgetStore.clear(ctx)
            runBlocking { WidgetRefresher.refreshAll(ctx) }
            true
        }
    }
}

/**
 * Pushes new data to every widget.
 *
 * updateAll is a suspend function that walks each registered widget id, so it
 * runs inside a coroutine rather than on the bridge thread.
 */
internal object WidgetRefresher {
    suspend fun refreshAll(context: Context) {
        for (widget in WIDGETS) widget.updateAll(context)
    }

    // Every widget, because a single write updates the whole set. Anything left
    // out of this list keeps drawing its previous snapshot indefinitely, so this
    // is the one place to touch when adding a widget.
    private val WIDGETS: List<GlanceAppWidget> = listOf(
        StreakWidget(),
        SrsWidget(),
        WeekWidget(),
        GoalWidget(),
        AchievementWidget()
    )
}
