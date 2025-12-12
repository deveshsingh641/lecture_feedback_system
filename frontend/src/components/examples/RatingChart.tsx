import { RatingChart } from "../RatingChart";

const mockData = [
  { rating: 1, count: 3 },
  { rating: 2, count: 7 },
  { rating: 3, count: 15 },
  { rating: 4, count: 28 },
  { rating: 5, count: 42 },
];

export default function RatingChartExample() {
  return (
    <div className="max-w-lg">
      <RatingChart data={mockData} />
    </div>
  );
}
