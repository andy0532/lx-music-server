import { FeaturesList } from '@/constants'
import { modules } from '@/modules'

const handler: LX.Sync.ServerSyncHandlerActions<LX.Socket> = {
  async onFeatureChanged(socket, feature) {
    const beforeFeature = socket.feature

    for (const name of FeaturesList) {
      const newStatus = feature[name]
      if (newStatus == null) continue
      beforeFeature[name] = feature[name]
      socket.moduleReadys[name] = false
      if (feature[name]) await modules[name].sync(socket).catch((_) => _)
    }
  },
}

export default handler
