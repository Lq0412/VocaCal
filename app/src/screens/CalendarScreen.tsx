import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CalendarEvent } from '../types/event';

const today = new Date().toISOString().slice(0, 10);

const sampleEvents: CalendarEvent[] = [
  {
    id: 1,
    title: '项目周会',
    date: today,
    time: '15:00',
    note: '语音示例：今天下午三点项目周会',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(today);

  const selectedEvents = useMemo(
    () =>
      sampleEvents
        .filter(event => event.date === selectedDate)
        .sort((left, right) => (left.time ?? '24:00').localeCompare(right.time ?? '24:00')),
    [selectedDate],
  );

  const markedDates = useMemo(
    () => ({
      [today]: {
        marked: true,
        dotColor: '#1677ff',
      },
      [selectedDate]: {
        selected: true,
        selectedColor: '#1677ff',
        selectedTextColor: '#ffffff',
      },
    }),
    [selectedDate],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title} testID="app-title">VocaCal</Text>
            <Text style={styles.subtitle}>语音日历助手</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>MVP</Text>
          </View>
        </View>

        <View style={styles.calendarPanel}>
          <Calendar
            current={selectedDate}
            markedDates={markedDates}
            onDayPress={day => setSelectedDate(day.dateString)}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#667085',
              todayTextColor: '#1677ff',
              arrowColor: '#1677ff',
              monthTextColor: '#101828',
              textMonthFontWeight: '600',
              textDayFontSize: 15,
              textMonthFontSize: 17,
              textDayHeaderFontSize: 13,
            }}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{formatDateLabel(selectedDate)}</Text>
          <Text style={styles.sectionMeta}>{selectedEvents.length} 个日程</Text>
        </View>

        <ScrollView
          style={styles.eventList}
          contentContainerStyle={styles.eventListContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>暂无日程</Text>
              <Text style={styles.emptyText}>按住下方按钮，说出“明天下午三点开会”。</Text>
            </View>
          ) : (
            selectedEvents.map(event => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventAccent} />
                <View style={styles.eventBody}>
                  <Text style={styles.eventTime}>{event.time ?? '全天'}</Text>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.note ? <Text style={styles.eventNote}>{event.note}</Text> : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <Pressable style={styles.voiceButton}>
          <Text style={styles.voiceButtonIcon}>MIC</Text>
          <Text style={styles.voiceButtonText}>按住说话</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${month}月${day}日 ${weekday}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingTop: 10,
  },
  title: {
    color: '#101828',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#667085',
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#e6f4ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: '#1677ff',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#eaecf0',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingTop: 18,
  },
  sectionTitle: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '600',
  },
  sectionMeta: {
    color: '#667085',
    fontSize: 13,
  },
  eventList: {
    flex: 1,
  },
  eventListContent: {
    paddingBottom: 96,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eaecf0',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eaecf0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  eventAccent: {
    backgroundColor: '#1677ff',
    width: 4,
  },
  eventBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eventTime: {
    color: '#1677ff',
    fontSize: 13,
    fontWeight: '600',
  },
  eventTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  eventNote: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  voiceButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#1677ff',
    borderRadius: 32,
    bottom: 24,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    width: 64,
  },
  voiceButtonIcon: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  voiceButtonText: {
    color: '#ffffff',
    fontSize: 10,
    marginTop: 2,
  },
});
