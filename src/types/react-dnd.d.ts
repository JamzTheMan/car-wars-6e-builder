import { DragSourceHookSpec, DropTargetHookSpec } from 'react-dnd';

declare module 'react-dnd' {
  interface DragSourceHookSpec<DragObject, DragSpecCollectedProps, DropResult> {
    type: string;
    item: DragObject;
    collect?: (monitor: any) => DragSpecCollectedProps;
    canDrag?: boolean | ((monitor: any) => boolean);
    end?: (item: DragObject, monitor: any) => void;
    isDragging?: (monitor: any) => boolean;
  }

  interface DropTargetHookSpec<DragObject, DropResult, DropSpecCollectedProps> {
    accept: string | string[];
    collect?: (monitor: any) => DropSpecCollectedProps;
    hover?: (item: DragObject, monitor: any) => void;
    drop?: (item: DragObject, monitor: any) => DropResult | undefined;
    canDrop?: (item: DragObject, monitor: any) => boolean;
  }

  export function useDrag<
    DragObject extends object,
    DropResult = any,
    CollectedProps extends object = any
  >(
    specArg: DragSourceHookSpec<DragObject, CollectedProps, DropResult>
  ): [CollectedProps, any];

  export function useDrop<
    DragObject extends object = any,
    DropResult = any,
    CollectedProps extends object = any
  >(
    specArg: DropTargetHookSpec<DragObject, DropResult, CollectedProps>
  ): [CollectedProps, any];
}
