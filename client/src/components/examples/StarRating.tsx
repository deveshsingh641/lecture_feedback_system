import { StarRating } from "../StarRating";
import { useState } from "react";

export default function StarRatingExample() {
  const [rating, setRating] = useState(0);

  return (
    <div className="space-y-6 p-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Display Rating (4.5)</p>
        <StarRating rating={4.5} showValue />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">Interactive Rating</p>
        <StarRating rating={rating} interactive onRatingChange={setRating} size="lg" />
        <p className="mt-2 text-sm">Selected: {rating} stars</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">Small Size (3 stars)</p>
        <StarRating rating={3} size="sm" />
      </div>
    </div>
  );
}
