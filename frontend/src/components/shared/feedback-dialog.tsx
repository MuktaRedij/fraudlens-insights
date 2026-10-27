import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FeedbackDialog({
  trigger,
  transactionId,
}: {
  trigger: React.ReactNode;
  transactionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState("Fraud");
  const [comment, setComment] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Analyst Feedback</DialogTitle>
          <DialogDescription>
            Record an analyst outcome for {transactionId}. This remains in your local demo session.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Fraud", "Legitimate", "False Positive", "Escalate"].map((v) => (
                  <SelectItem value={v} key={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="feedback-comment">Comment</Label>
            <Textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2"
              placeholder="Add investigation context..."
            />
          </div>
          <div>
            <Label>Confidence</Label>
            <Select defaultValue="High">
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Low", "Medium", "High"].map((v) => (
                  <SelectItem value={v} key={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              localStorage.setItem(
                `feedback:${transactionId}`,
                JSON.stringify({ outcome, comment, date: new Date().toISOString() }),
              );
              toast.success("Feedback recorded successfully.");
              setOpen(false);
            }}
          >
            Submit feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
