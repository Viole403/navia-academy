package com.navia.academy.widgets

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.height
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/** The one widget that can be acted on without opening the app, so the number leads. */
class SrsWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snap = WidgetStore.read(context)
        val palette = snap.palette()
        val due = snap.due
        provideContent {
            WidgetColumn(palette) {
                Label("REVIEWS", palette)
                BigNumber(
                    value = when (due) {
                        null -> "—"
                        else -> due.toString()
                    },
                    palette = palette,
                    // Unknown must not borrow the "clear" voice; it gets the plain
                    // foreground, because nothing has been counted yet.
                    accent = (due ?: 0) > 0
                )
                Spacer(GlanceModifier.height(2.dp))
                Sub(
                    text = when (due) {
                        null -> "Not counted yet"
                        0 -> "All clear"
                        1 -> "1 card waiting"
                        else -> "$due cards waiting"
                    },
                    palette = palette,
                    accent = (due ?: 0) > 0
                )
            }
        }
    }
}

class SrsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SrsWidget()
}

/** The streak strip at full size: seven marks answer "how steady", not "how long". */
class WeekWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snap = WidgetStore.read(context)
        val palette = snap.palette()
        val done = snap.recent.count { it }
        provideContent {
            WidgetColumn(palette) {
                Label("THIS WEEK", palette)
                Spacer(GlanceModifier.height(10.dp))
                DotStrip(snap = snap, palette = palette)
                Spacer(GlanceModifier.height(10.dp))
                Sub(text = "$done of 7 days", palette = palette, accent = false, size = 15)
                Spacer(GlanceModifier.height(2.dp))
                Sub(text = "Longest ${snap.bestStreak}", palette = palette, accent = false)
            }
        }
    }
}

/** Seven marks, oldest first; today stays hollow until it is done. */
@Composable
internal fun DotStrip(
    snap: WidgetSnapshot,
    palette: WidgetPalette,
    dot: Int = 14,
    gap: Int = 8,
) {
    Row {
        snap.recent.forEachIndexed { index, isDone ->
            val isToday = index == snap.recent.lastIndex
            Box(
                modifier = GlanceModifier
                    .size(dp(dot))
                    .background(
                        when {
                            isDone -> palette.accent
                            isToday -> ColorProvider(Color.Transparent)
                            else -> palette.muted
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (isToday && !isDone) {
                    Text(text = "·", style = TextStyle(color = palette.accent, fontSize = 12.sp))
                }
            }
            if (index != snap.recent.lastIndex) Spacer(GlanceModifier.width(dp(gap)))
        }
    }
}

internal fun dp(v: Int) = v.toFloat().dp

/** Ten segments, not a bar: countable at two cells wide where a thin bar is not. */
class GoalWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snap = WidgetStore.read(context)
        val palette = snap.palette()
        val filled = Math.round(snap.goalProgress * SEGMENTS)
        val percent = Math.round(snap.goalProgress * 100)
        val done = snap.goalProgress >= 1f
        provideContent {
            WidgetColumn(palette) {
                Label("TODAY'S GOAL", palette)
                Spacer(GlanceModifier.height(10.dp))
                Row {
                    repeat(SEGMENTS) { i ->
                        Box(
                            modifier = GlanceModifier
                                .size(10.dp)
                                .background(if (i < filled) palette.accent else palette.muted)
                        ) {}
                        if (i != SEGMENTS - 1) Spacer(GlanceModifier.width(4.dp))
                    }
                }
                Spacer(GlanceModifier.height(10.dp))
                Sub(
                    text = "${snap.minutesToday} / ${snap.dailyGoalMinutes} min",
                    palette = palette,
                    accent = false,
                    size = 15
                )
                Spacer(GlanceModifier.height(2.dp))
                Sub(
                    text = if (done) "Goal reached" else "$percent% there",
                    palette = palette,
                    accent = done
                )
            }
        }
    }

    private companion object {
        const val SEGMENTS = 10
    }
}

class GoalWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = GoalWidget()
}

/** Milestones are sparse on purpose — a widget that congratulates daily stops being read. */
class AchievementWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snap = WidgetStore.read(context)
        val palette = snap.palette()
        val milestone = snap.milestone
        provideContent {
            WidgetColumn(palette) {
                Label("BEST STREAK", palette)
                BigNumber(
                    value = if (snap.bestStreak > 0) snap.bestStreak.toString() else "—",
                    palette = palette,
                    accent = milestone != null
                )
                Spacer(GlanceModifier.height(2.dp))
                Sub(
                    text = when {
                        milestone != null -> "$milestone milestone"
                        snap.streak > 0 -> "Current ${snap.streak}"
                        else -> "No streak yet"
                    },
                    palette = palette,
                    accent = milestone != null
                )
            }
        }
    }
}

class AchievementWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = AchievementWidget()
}

@Composable
internal fun Label(text: String, palette: WidgetPalette) {
    Text(
        text = text,
        style = TextStyle(
            color = palette.muted,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
    )
}

@Composable
internal fun BigNumber(value: String, palette: WidgetPalette, accent: Boolean) {
    Text(
        text = value,
        style = TextStyle(
            color = if (accent) palette.accent else palette.foreground,
            fontSize = 40.sp,
            fontWeight = FontWeight.Bold
        )
    )
}

@Composable
internal fun Sub(
    text: String,
    palette: WidgetPalette,
    accent: Boolean,
    size: Int = 13,
) {
    Text(
        text = text,
        style = TextStyle(
            color = if (accent) palette.accent else palette.muted,
            fontSize = size.sp
        )
    )
}
