export default function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      {/* Spinner */}
      <svg
        className="h-10 w-10 animate-spin text-cyan-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-400">
          Initializing sensors...
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Waiting for first data reading
        </p>
      </div>
    </div>
  );
}
