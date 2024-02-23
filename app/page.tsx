"use client";

import React, { useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;
    setIsProcessing(true);

    try {
      const transactions = (
        await Promise.all([...files].map(readAndProcessData))
      ).flat();
      const flattenedTransactions = transactions.flat();
      const ynabCsv = Papa.unparse(flattenedTransactions);
      const blob = new Blob([ynabCsv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ynab.csv";
      a.click();
    } catch (e) {
      console.error(e);
      if (typeof e === "string") setError(e);
      if (e instanceof Error) setError(e.message);
    }
    setIsProcessing(false);
  };

  if (isProcessing) return <p>Processing...</p>;
  return (
    <div>
      {error && <p className="text-red-500">{error}</p>}
      <input
        type="file"
        onChange={handleFileSelected}
        accept="text/csv"
        multiple
      />
    </div>
  );
}

const readAndProcessData = (file: File) => {
  const reader = new FileReader();
  return new Promise<
    {
      ["Date"]: string;
      ["Memo"]: string;
      ["Payee"]: string;
      ["Outflow"]: string;
      ["Inflow"]: string;
    }[]
  >((resolve, reject) => {
    reader.onload = (e) => {
      const content = e.target?.result?.toString() || "";
      if (!content.startsWith("Firstname Lastname"))
        reject("Invalid Lydia CSV file");
      const lines = content.split("\n").slice(5);
      const { data } = Papa.parse(lines.join("\n"));
      const transactions = data.slice(1).map((row) => {
        const [date, description, outflow, inflow] = row as string[];
        const { payee, memo } = parseDescription(description);
        return {
          ["Date"]: date,
          ["Memo"]: memo,
          ["Payee"]: toTitleCase(payee),
          ["Outflow"]: outflow?.slice(1),
          ["Inflow"]: inflow,
        };
      });
      resolve(transactions);
    };

    reader.onerror = () => {
      reject("Error reading file");
    };

    reader.readAsText(file);
  });
};

const parseDescription = (description?: string) => {
  if (!description)
    return {
      payee: "",
      memo: "",
    };
  if (description.includes("Payment to")) {
    return {
      payee: description.split("Payment to")[1].trim(),
      memo: "",
    };
  }
  if (description.includes("Card transaction:")) {
    return {
      payee: description
        .split("Card transaction:")[1]
        .trim()
        .replace("PAYPAL *", ""),
      memo: "",
    };
  }
  if (description.includes("received from")) {
    return {
      payee: description.split("received from")[1].trim(),
      memo: "",
    };
  }
  if (description.includes("Direct debit:")) {
    return {
      payee: description.split("Direct debit:")[1].trim(),
      memo: "",
    };
  }
  if (description.includes("Adjustment of the card transaction")) {
    return {
      payee: description.split(":")[1].trim(),
      memo: "Adjustment",
    };
  }
  if (description.includes("Payment source modification")) {
    return {
      payee: description.split(":")[1].split("-")[0].trim(),
      memo: "Source modification",
    };
  }
  if (description.includes("SEPA direct debit emitted to")) {
    return {
      payee: description.split("SEPA direct debit emitted to")[1].trim(),
      memo: "",
    };
  }
  if (description.includes("Cancellation of the card transaction"))
    return {
      payee: description.split(":")[1].trim(),
      memo: "Cancellation",
    };
  if (description.includes("Internal bank transfer emitted")) {
    return {
      payee: "Internal transfer",
      memo: "",
    };
  }
  if (description.includes("Refund of the card transaction")) {
    return {
      payee: description.split(":")[1].trim(),
      memo: "Refund",
    };
  }
  return {
    payee: "",
    memo: description,
  };
};

const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  });
};
