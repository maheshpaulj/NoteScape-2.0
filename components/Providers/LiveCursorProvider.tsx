"use client";

import { useMyPresence, useOthers } from "@liveblocks/react/suspense";
import React, { PointerEvent, useRef, useEffect, useState } from "react";
import FollowPointer from "../FollowPointer";

function LiveCursorProvider({ children }: { children: React.ReactNode }) {
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions on resize
  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    }

    // Initial measurement
    updateDimensions();

    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!containerRef.current) return;

    // Get the container's bounding rectangle
    const rect = containerRef.current.getBoundingClientRect();

    // Calculate relative position (0-1)
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;

    // Only update if the cursor is within bounds
    if (relativeX >= 0 && relativeX <= 1 && relativeY >= 0 && relativeY <= 1) {
      updateMyPresence({
        cursor: {
          x: relativeX,
          y: relativeY
        }
      });
    }
  }

  function handlePointerLeave() {
    updateMyPresence({ cursor: null });
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-full"
    >
      {others
        .filter((other) => other.presence.cursor !== null)
        .map(({ connectionId, presence, info }) => {
          // Convert the relative positions back to pixels for this viewport
          const pixelX = Math.floor(presence.cursor?.x! * dimensions.width);
          const pixelY = Math.floor(presence.cursor?.y! * dimensions.height);

          return (
            <FollowPointer
              key={connectionId}
              info={info}
              x={pixelX}
              y={pixelY}
            />
          );
        })}
      {children}
    </div>
  );
}

export default LiveCursorProvider;