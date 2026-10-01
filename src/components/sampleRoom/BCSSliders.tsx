import { BCS } from './model'
import { Slider } from './controls'

export default function BCSSliders({ bcs, onChange }: { bcs: BCS; onChange: (b: BCS) => void }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 items-end">
      <div className="min-w-[220px]">
        <Slider
          label={`Brightness: ${bcs.brightness}`}
          min={0}
          max={200}
          step={1}
          value={bcs.brightness}
          onChange={v => onChange({ ...bcs, brightness: v })}
        />
      </div>
      <div className="min-w-[220px]">
        <Slider
          label={`Contrast: ${bcs.contrast}`}
          min={0}
          max={200}
          step={1}
          value={bcs.contrast}
          onChange={v => onChange({ ...bcs, contrast: v })}
        />
      </div>
      <div className="min-w-[220px]">
        <Slider
          label={`Saturation: ${bcs.saturation}`}
          min={0}
          max={200}
          step={1}
          value={bcs.saturation}
          onChange={v => onChange({ ...bcs, saturation: v })}
        />
      </div>
    </div>
  )
}
