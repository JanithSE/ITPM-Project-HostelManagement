import User from '../models/User.js'

export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role required' })
    }
    if (!['student', 'admin', 'warden'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student, admin, or warden' })
    }
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ error: 'Email already registered' })
    const user = await User.create({ name, email, password, role })
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const updateUser = async (req, res) => {
  try {
    const { name, email, role, password, academicYear, academicSemester } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (name != null) user.name = name
    if (email != null) user.email = email
    if (role != null) user.role = role
    if (password != null) user.password = password
    if (user.role === 'student' && (academicYear != null || academicSemester != null)) {
      if (academicYear != null) {
        if (academicYear === '' || academicYear === null) user.academicYear = null
        else {
          const y = Number(academicYear)
          if (!Number.isInteger(y) || y < 1 || y > 4) {
            return res.status(400).json({ error: 'academicYear must be between 1 and 4' })
          }
          user.academicYear = y
        }
      }
      if (academicSemester != null) {
        if (academicSemester === '' || academicSemester === null) user.academicSemester = null
        else {
          const s = Number(academicSemester)
          if (s !== 1 && s !== 2) {
            return res.status(400).json({ error: 'academicSemester must be 1 or 2' })
          }
          user.academicSemester = s
        }
      }
    }

    await user.save()
    const safeUser = user.toObject()
    delete safeUser.password
    res.json(safeUser)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

