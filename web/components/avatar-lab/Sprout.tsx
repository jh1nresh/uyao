
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react'
import { loadAvatarRuntime, type AvatarData, type RuntimeAvatar } from './avatar-runtime'
import { avatarData, type AnimationName } from './sprout.avatar'

export type { AnimationName } from './sprout.avatar'
export type AvatarHandle = {
  play: (animation?: AnimationName) => void
  pause: () => void
  stop: () => void
}
export type AvatarProps = {
  animation?: AnimationName
  playing?: boolean
  loop?: boolean
  size?: number | string
  className?: string
  style?: CSSProperties
  onAnimationEnd?: (animation: AnimationName) => void
  // Alternate export data for a single surface. The runtime is cached by object
  // identity, so this must be a stable module-level value, not built per render.
  data?: AvatarData<AnimationName>
}

export const Sprout = forwardRef<AvatarHandle, AvatarProps>(function Sprout(
  {
    animation = "listening",
    playing = true,
    loop,
    size = 240,
    className,
    style,
    onAnimationEnd,
    data = avatarData,
  },
  ref
) {
  const host = useRef<HTMLSpanElement>(null)
  const controller = useRef<RuntimeAvatar<AnimationName> | null>(null)
  const animationRef = useRef(animation)
  const playingRef = useRef(playing)
  const onAnimationEndRef = useRef(onAnimationEnd)
  animationRef.current = animation
  playingRef.current = playing
  onAnimationEndRef.current = onAnimationEnd

  useEffect(() => {
    if (!host.current) return
    let disposed = false
    let avatar: RuntimeAvatar<AnimationName> | null = null
    // `idle` is provided by the footer's alternate Bible Strong export; the
    // bundled data still only contains its original listening/ambient pair.
    void loadAvatarRuntime<AnimationName>(data as AvatarData<AnimationName>).then(runtime => {
      if (disposed || !host.current) return
      avatar = runtime.createAvatar(host.current, {
        animation: animationRef.current,
        autoplay: playingRef.current,
        loop,
        size: '100%',
        onAnimationEnd: next => onAnimationEndRef.current?.(next),
      })
      controller.current = avatar
    })
    return () => {
      disposed = true
      avatar?.destroy()
      controller.current = null
    }
  }, [loop, data])

  useEffect(() => {
    const avatar = controller.current
    if (!avatar) return
    if (playing) avatar.play(animation)
    else avatar.pause()
  }, [animation, playing])

  useImperativeHandle(ref, () => ({
    play(next = animation) { controller.current?.play(next) },
    pause() { controller.current?.pause() },
    stop() { controller.current?.stop() },
  }), [animation])

  const dimension = typeof size === 'number' ? size + 'px' : size
  return <span ref={host} className={className} style={{ display: 'inline-block', width: dimension, height: dimension, ...style }} />
})

export default Sprout
