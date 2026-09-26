package com.navia.academy.widgets

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Spacer
import androidx.glance.layout.height
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * The streak widget.
 *
 * The design is Duolingo's, and their own write-up is why it is this plain:
 * users were reminded of the number and of whether it was at risk, and nothing
 * else. They tested adding more statistics and found that pair alone was what
 * mattered. So there are two facts here, a strip of the week, and no dashboard.
 *
 * The mood is what earns its place. The same number means something different
 * depending on whether today is done, so the accent shifts with it — a live
 * streak nobody has touched reads as a warning rather than a fact.
 */
class StreakWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snap = WidgetStore.read(context)
        val palette = snap.palette()
        provideContent {
            WidgetColumn(palette) {
                Text(
                    text = moodLabel(snap),
                    style = TextStyle(
                        color = palette.muted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                )
                Spacer(GlanceModifier.height(4.dp))
                Text(
                    text = if (snap.streak > 0) snap.streak.toString() else "—",
                    style = TextStyle(
                        color = if (snap.atRisk) palette.accent else palette.foreground,
                        fontSize = 44.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                Spacer(GlanceModifier.height(2.dp))
                Text(
                    text = headline(snap),
                    style = TextStyle(color = palette.accent, fontSize = 13.sp)
                )
                Spacer(GlanceModifier.height(10.dp))
                DotStrip(snap = snap, palette = palette, dot = 10, gap = 5)
            }
        }
    }
}

private fun moodLabel(snap: WidgetSnapshot): String = when (snap.mood) {
    "celebrate" -> "TODAY"
    "atRisk" -> "STILL OPEN"
    else -> "NO STREAK YET"
}

private fun headline(snap: WidgetSnapshot): String = when {
    snap.studiedToday && (snap.due ?: 0) > 0 -> "${snap.due} to review"
    snap.studiedToday -> "Done for today"
    snap.streak > 0 -> "${snap.streak} at risk"
    else -> "Start a streak"
}

class StreakWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = StreakWidget()
}
