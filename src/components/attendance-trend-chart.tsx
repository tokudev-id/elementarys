"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

export type TrendPoint = {
  date: string;
  H: number;
  S: number;
  I: number;
  A: number;
  rate: number | null;
};

const dayFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const tickFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function formatDay(date: string, format = dayFormat) {
  return format.format(new Date(date + "T12:00:00Z"));
}

function TrendTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const point = active ? (payload?.[0]?.payload as TrendPoint | undefined) : undefined;
  if (!point) return null;
  return (
    <div className="chart-tooltip">
      <strong>{formatDay(point.date)}</strong>
      {point.rate === null ? (
        <span>Belum ada catatan</span>
      ) : (
        <>
          <span className="chart-tooltip__value">{point.rate}% hadir</span>
          <span>
            {point.H} H · {point.S} S · {point.I} I · {point.A} A
          </span>
        </>
      )}
    </div>
  );
}

export function AttendanceTrendChart({ points }: { points: TrendPoint[] }) {
  const recorded = points.filter((point) => point.rate !== null);
  return (
    <figure className="trend-chart">
      <div className="trend-chart__plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatDay(value, tickFormat)}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={TrendTooltip} cursor={{ className: "trend-chart__cursor" }} />
            <Area
              type="monotone"
              dataKey="rate"
              connectNulls
              strokeWidth={2}
              dot={{ r: 3, className: "trend-chart__dot" }}
              activeDot={{ r: 5, className: "trend-chart__dot trend-chart__dot--active" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* text alternative for the chart */}
      <table className="sr-only">
        <caption>Persentase kehadiran per hari sekolah</caption>
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Hadir</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDay(point.date)}</th>
              <td>{point.rate === null ? "Belum ada catatan" : `${point.rate}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!recorded.length && (
        <figcaption className="trend-chart__empty">
          Belum ada absensi tersimpan dalam {points.length} hari sekolah terakhir.
        </figcaption>
      )}
    </figure>
  );
}
